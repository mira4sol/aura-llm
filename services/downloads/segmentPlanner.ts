import { getSegmentTempPath } from '@/lib/models/modelPaths';
import type { DownloadSegment } from '@/lib/types';

/**
 * Plans a single native resumable transfer per remote file.
 *
 * `@kesha-antonov/react-native-background-downloader` v5 natively manages HTTP `Range`
 * pause/resume (`ResumableDownloader.kt` on Android, `NSURLSession` resumeData on iOS).
 * Sending manual 256 MB `Range: bytes=start-end` headers conflicts with `ResumableDownloader`'s
 * internal `Range: bytes=$startByte-` retry logic, which overwrote segment bounds and caused
 * single segments to stream the entire multi-GB file.
 */
export function planFileSegments(
  bundleId: string,
  fileIndex: number,
  totalBytes: number
): DownloadSegment[] {
  return [
    {
      index: 0,
      start: 0,
      end: totalBytes > 0 ? totalBytes - 1 : 0,
      tempPath: getSegmentTempPath(bundleId, fileIndex, 0),
      bytesDone: 0,
      status: 'pending',
    },
  ];
}

export function buildNativeTaskId(
  bundleId: string,
  fileIndex: number,
  segmentIndex: number
): string {
  return `${bundleId}::f${fileIndex}::s${segmentIndex}`;
}

/**
 * Clamps reported downloaded bytes to the expected file size (when known) so UI progress
 * never displays impossible overflows such as 3.9 GB / 3.0 GB.
 */
export function clampSegmentBytes(bytesDownloaded: number, expectedBytes: number): number {
  const safe = Math.max(0, Number.isFinite(bytesDownloaded) ? bytesDownloaded : 0);
  if (expectedBytes > 0) {
    return Math.min(safe, expectedBytes);
  }
  return safe;
}

/**
 * Detects runaway transfers where the native downloader reports significantly more bytes
 * than the authoritative Content-Length (> 102% + 2 MB tolerance).
 */
export function isRunawayDownloadOverflow(bytesDownloaded: number, expectedBytes: number): boolean {
  if (expectedBytes <= 0) return false;
  const tolerance = Math.max(2 * 1024 * 1024, Math.round(expectedBytes * 0.02));
  return bytesDownloaded > expectedBytes + tolerance;
}
