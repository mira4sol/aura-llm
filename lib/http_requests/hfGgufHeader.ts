import { hfClient } from './hfClient';
import { buildHfResolveUrl } from './hfUrls';
import { parseGgufHeader } from '@/lib/models/ggufHeaderParser';
import type { GgufHeaderMeta } from '@/lib/types';

const PROBE_SIZES = [512 * 1024, 2 * 1024 * 1024, 8 * 1024 * 1024];

/**
 * Fetches only the leading bytes of a remote GGUF file via HTTP Range requests
 * and parses its KV metadata header (architecture, context length, KV heads, etc.)
 * without downloading the model weights.
 */
export async function fetchRemoteGgufHeader(
  repoId: string,
  filePath: string
): Promise<GgufHeaderMeta | null> {
  const url = buildHfResolveUrl(repoId, filePath);

  for (const byteLimit of PROBE_SIZES) {
    try {
      const response = await hfClient.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
        headers: {
          Range: `bytes=0-${byteLimit - 1}`,
        },
        timeout: 15000,
      });

      const buf = new Uint8Array(response.data);
      const result = parseGgufHeader(buf);
      if (result.complete) {
        return result.meta;
      }
      if (!result.needsMoreBytes) {
        return result.meta;
      }
    } catch {
      return null;
    }
  }
  return null;
}
