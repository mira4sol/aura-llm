import { Directory, Paths } from 'expo-file-system';

function sanitizeSegment(input: string): string {
  return input.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function getModelsRootDir(): string {
  const docUri = Paths.document?.uri ?? 'file:///models';
  return `${docUri.replace(/\/$/, '')}/models`;
}

export function getDownloadsTempDir(): string {
  const cacheUri = Paths.cache?.uri ?? 'file:///cache';
  return `${cacheUri.replace(/\/$/, '')}/aura-downloads`;
}

export function getModelBundleDir(repoId: string, quant: string): string {
  return `${getModelsRootDir()}/${sanitizeSegment(repoId)}/${sanitizeSegment(quant)}`;
}

export function getModelFilePath(repoId: string, quant: string, relativePath: string): string {
  const fileName = sanitizeSegment(relativePath.split('/').pop() ?? relativePath);
  return `${getModelBundleDir(repoId, quant)}/${fileName}`;
}

export function getSegmentTempPath(
  bundleId: string,
  fileIndex: number,
  segmentIndex: number
): string {
  return `${getDownloadsTempDir()}/${sanitizeSegment(bundleId)}__f${fileIndex}_s${segmentIndex}.part`;
}

export function ensureDirectory(uri: string): void {
  try {
    const dir = new Directory(uri);
    if (!dir.exists) {
      dir.create({ intermediates: true, idempotent: true });
    }
  } catch {
    // Non-native test environments may not implement Directory
  }
}
