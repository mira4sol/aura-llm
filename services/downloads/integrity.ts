import { Directory, File } from 'expo-file-system';

import { concatFiles, excludeFromBackup, isAuraNativeAvailable, sha256File } from '@/modules/aura-native';
import { ensureDirectory, getDownloadsTempDir } from '@/lib/models/modelPaths';
import type { DownloadFileState, DownloadTaskState } from '@/lib/types';

export function deleteFileQuietly(uri: string): void {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // ignore
  }
}

export function getFileSizeQuietly(uri: string): number {
  try {
    const f = new File(uri);
    if (!f.exists) return 0;
    return f.size ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Assembles segments (or moves a single-segment file) to its final destination
 * and marks it excluded from iCloud backup on iOS.
 */
export async function assembleDownloadedFile(fileState: DownloadFileState): Promise<void> {
  const parentDir = fileState.destPath.slice(0, fileState.destPath.lastIndexOf('/'));
  ensureDirectory(parentDir);

  if (fileState.segments.length === 1) {
    const partPath = fileState.segments[0].tempPath;
    deleteFileQuietly(fileState.destPath);
    try {
      // Instant O(1) atomic rename on same filesystem — avoids copying multi-GB files twice
      const src = new File(partPath);
      src.move(new File(fileState.destPath));
    } catch {
      // Cross-partition fallback (e.g., cache -> filesDir on different mounts)
      if (isAuraNativeAvailable()) {
        await concatFiles([partPath], fileState.destPath);
      } else {
        throw new Error('Failed to move downloaded file to vault directory');
      }
    }
  } else {
    const orderedParts = [...fileState.segments]
      .sort((a, b) => a.index - b.index)
      .map((s) => s.tempPath);
    await concatFiles(orderedParts, fileState.destPath);
  }

  await excludeFromBackup(fileState.destPath).catch(() => {});
}

/**
 * Verifies exact byte size and (when LFS SHA-256 is known) native SHA-256 checksum.
 */
export async function verifyDownloadedFile(
  fileState: DownloadFileState
): Promise<{ ok: boolean; reason?: string }> {
  const actualSize = getFileSizeQuietly(fileState.destPath);
  if (fileState.remote.sizeBytes > 0 && actualSize !== fileState.remote.sizeBytes) {
    return {
      ok: false,
      reason: `Size mismatch (expected ${fileState.remote.sizeBytes} bytes, got ${actualSize})`,
    };
  }

  if (fileState.remote.sha256 && isAuraNativeAvailable()) {
    const computed = await sha256File(fileState.destPath);
    if (computed.toLowerCase() !== fileState.remote.sha256.toLowerCase()) {
      return {
        ok: false,
        reason: 'SHA-256 checksum mismatch — file may have been corrupted in transit',
      };
    }
  }

  return { ok: true };
}

/**
 * Removes all temp segment files for a cancelled or failed bundle.
 */
export function cleanupBundleTemps(task: DownloadTaskState): void {
  for (const f of task.files) {
    for (const s of f.segments) {
      deleteFileQuietly(s.tempPath);
    }
    deleteFileQuietly(f.destPath);
  }
}

/**
 * Sweeps orphaned *.part files left behind in cache/aura-downloads that are not
 * referenced by any active or paused download in the persisted queue.
 */
export function sweepOrphanedTempFiles(activeTasks: DownloadTaskState[]): void {
  try {
    const tempDir = new Directory(getDownloadsTempDir());
    if (!tempDir.exists) return;

    const referenced = new Set<string>();
    for (const t of activeTasks) {
      if (t.status === 'completed' || t.status === 'cancelled') continue;
      for (const f of t.files) {
        for (const s of f.segments) {
          referenced.add(s.tempPath);
        }
      }
    }

    for (const entry of tempDir.list()) {
      if (entry instanceof File && entry.uri.endsWith('.part') && !referenced.has(entry.uri)) {
        try {
          entry.delete();
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }
}
