import { Directory, File, Paths } from 'expo-file-system';

function toFileUri(path: string): string {
  if (path.startsWith('file://')) return path;
  return `file://${path}`;
}

function stripFileScheme(uri: string): string {
  return uri.replace(/^file:\/\//, '');
}

export const DocumentDirectoryPath = stripFileScheme(Paths.document?.uri ?? '').replace(/\/$/, '');
export const CachesDirectoryPath = stripFileScheme(Paths.cache?.uri ?? '').replace(/\/$/, '');

export async function exists(path: string): Promise<boolean> {
  try {
    const uri = toFileUri(path);
    return new File(uri).exists || new Directory(uri).exists;
  } catch {
    return false;
  }
}

export async function mkdir(path: string): Promise<void> {
  const dir = new Directory(toFileUri(path));
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
}

export async function unlink(path: string): Promise<void> {
  const uri = toFileUri(path);
  try {
    const f = new File(uri);
    if (f.exists) {
      f.delete();
      return;
    }
    const d = new Directory(uri);
    if (d.exists) {
      d.delete();
    }
  } catch {
    // ignore if already removed
  }
}

export async function readFile(path: string): Promise<string> {
  const f = new File(toFileUri(path));
  return f.text();
}

export async function writeFile(path: string, contents: string): Promise<void> {
  const f = new File(toFileUri(path));
  f.write(contents);
}

export async function stat(path: string): Promise<{
  path: string;
  size: number;
  isFile: () => boolean;
  isDirectory: () => boolean;
}> {
  const uri = toFileUri(path);
  const d = new Directory(uri);
  if (d.exists) {
    return {
      path,
      size: 0,
      isFile: () => false,
      isDirectory: () => true,
    };
  }
  const f = new File(uri);
  return {
    path,
    size: f.exists ? (f.size ?? 0) : 0,
    isFile: () => true,
    isDirectory: () => false,
  };
}

export async function readDir(path: string): Promise<
  {
    name: string;
    path: string;
    size: number;
    isFile: () => boolean;
    isDirectory: () => boolean;
  }[]
> {
  const dir = new Directory(toFileUri(path));
  if (!dir.exists) return [];
  return dir.list().map((entry) => {
    const isDir = entry instanceof Directory;
    const entryPath = stripFileScheme(entry.uri);
    const name = entryPath.replace(/\/$/, '').split('/').pop() ?? '';
    return {
      name,
      path: entryPath,
      size: !isDir && entry instanceof File ? (entry.size ?? 0) : 0,
      isFile: () => !isDir,
      isDirectory: () => isDir,
    };
  });
}

export default {
  DocumentDirectoryPath,
  CachesDirectoryPath,
  exists,
  mkdir,
  unlink,
  readFile,
  writeFile,
  stat,
  readDir,
};
