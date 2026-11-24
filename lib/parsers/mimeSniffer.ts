export type SupportedDocumentKind = 'text' | 'markdown' | 'json' | 'csv' | 'code' | 'pdf' | 'unsupported';

const TEXT_EXTENSIONS = new Set(['txt', 'log', 'ini', 'cfg', 'env']);
const MD_EXTENSIONS = new Set(['md', 'markdown', 'mdx']);
const JSON_EXTENSIONS = new Set(['json', 'jsonl', 'geojson']);
const CSV_EXTENSIONS = new Set(['csv', 'tsv']);
const CODE_EXTENSIONS = new Set([
  'ts',
  'tsx',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'py',
  'rb',
  'go',
  'rs',
  'java',
  'kt',
  'swift',
  'c',
  'cc',
  'cpp',
  'h',
  'hpp',
  'cs',
  'php',
  'sh',
  'bash',
  'zsh',
  'sql',
  'yaml',
  'yml',
  'toml',
  'xml',
  'html',
  'css',
  'scss',
  'graphql',
  'dockerfile',
]);

const BLOCKED_BINARY_EXT = new Set([
  'zip',
  'tar',
  'gz',
  'bz2',
  '7z',
  'rar',
  'exe',
  'dll',
  'so',
  'dylib',
  'dmg',
  'apk',
  'ipa',
  'bin',
  'class',
  'wasm',
  'mp4',
  'mov',
  'avi',
  'mkv',
  'docx',
  'xlsx',
  'pptx',
]);

export interface SniffResult {
  kind: SupportedDocumentKind;
  supported: boolean;
  reason?: string;
}

/**
 * Inspects file extension, MIME type, and optional leading magic bytes
 * to allowlist offline-parseable documents and clearly block unsupported binaries.
 */
export function sniffDocument(
  filename: string,
  mime?: string | null,
  leadingBytes?: Uint8Array
): SniffResult {
  // Magic-byte checks first when available
  if (leadingBytes && leadingBytes.length >= 4) {
    // PDF: %PDF
    if (
      leadingBytes[0] === 0x25 &&
      leadingBytes[1] === 0x50 &&
      leadingBytes[2] === 0x44 &&
      leadingBytes[3] === 0x46
    ) {
      return { kind: 'pdf', supported: true };
    }
    // ZIP / Office / JAR / APK: PK\x03\x04
    if (leadingBytes[0] === 0x50 && leadingBytes[1] === 0x4b && leadingBytes[2] === 0x03 && leadingBytes[3] === 0x04) {
      return {
        kind: 'unsupported',
        supported: false,
        reason: 'Compressed archive or Office binary format is not supported offline.',
      };
    }
    // ELF / Mach-O / PE executable
    if (
      (leadingBytes[0] === 0x7f && leadingBytes[1] === 0x45 && leadingBytes[2] === 0x4c && leadingBytes[3] === 0x46) ||
      (leadingBytes[0] === 0x4d && leadingBytes[1] === 0x5a)
    ) {
      return {
        kind: 'unsupported',
        supported: false,
        reason: 'Executable binary files cannot be attached to chat context.',
      };
    }
    // Null-byte heuristic for arbitrary binary
    const sampleLen = Math.min(leadingBytes.length, 512);
    let nullCount = 0;
    for (let i = 0; i < sampleLen; i++) {
      if (leadingBytes[i] === 0) nullCount++;
    }
    if (nullCount > 4) {
      return {
        kind: 'unsupported',
        supported: false,
        reason: 'Binary file format is not supported by the local text parser.',
      };
    }
  }

  const ext = (filename.split('.').pop() ?? '').toLowerCase();
  const m = (mime ?? '').toLowerCase();

  if (ext === 'pdf' || m === 'application/pdf') return { kind: 'pdf', supported: true };
  if (BLOCKED_BINARY_EXT.has(ext)) {
    return {
      kind: 'unsupported',
      supported: false,
      reason: `".${ext}" binary files are not supported offline. Convert to PDF, TXT, MD, CSV, or JSON.`,
    };
  }
  if (MD_EXTENSIONS.has(ext) || m === 'text/markdown') return { kind: 'markdown', supported: true };
  if (JSON_EXTENSIONS.has(ext) || m === 'application/json') return { kind: 'json', supported: true };
  if (CSV_EXTENSIONS.has(ext) || m === 'text/csv') return { kind: 'csv', supported: true };
  if (CODE_EXTENSIONS.has(ext)) return { kind: 'code', supported: true };
  if (TEXT_EXTENSIONS.has(ext) || m.startsWith('text/')) return { kind: 'text', supported: true };

  return {
    kind: 'unsupported',
    supported: false,
    reason: `Unsupported file type "${ext || mime || 'unknown'}". Supported: TXT, MD, JSON, CSV, PDF, and source code.`,
  };
}
