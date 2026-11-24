export const HF_BASE_URL = 'https://huggingface.co';
/** Public read-only Hugging Face mirror used only when huggingface.co is unreachable from the device network. */
export const HF_MIRROR_URL = 'https://hf-mirror.com';

let activeBaseUrl = HF_BASE_URL;

/** Currently active Hub origin (switches to the mirror for the session if huggingface.co is blocked). */
export function getHfBaseUrl(): string {
  return activeBaseUrl;
}

export interface HfRequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
  responseType?: 'json' | 'arraybuffer';
}

export interface HfResponse<T> {
  data: T;
  status: number;
}

export class HfHttpError extends Error {
  status?: number;
  url: string;

  constructor(message: string, url: string, status?: number) {
    super(message);
    this.name = 'HfHttpError';
    this.url = url;
    this.status = status;
  }
}

/**
 * Pure query-string builder avoiding React Native's incomplete URLSearchParams polyfill.
 */
export function buildQueryString(entries: [string, string][]): string {
  return entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

function resolveUrl(urlOrPath: string, base: string): string {
  if (/^https?:\/\//i.test(urlOrPath)) return urlOrPath;
  const slash = urlOrPath.startsWith('/') ? '' : '/';
  return `${base}${slash}${urlOrPath}`;
}

function swapOrigin(fullUrl: string, base: string): string {
  return fullUrl.replace(/^https?:\/\/[^/]+/i, base);
}

type TransportResult = { status: number; data: unknown };

/** Transport A: global fetch (Expo native fetch / OkHttp on Android, NSURLSession on iOS). */
async function fetchTransport(
  url: string,
  headers: Record<string, string>,
  timeoutMs: number,
  responseType: 'json' | 'arraybuffer'
): Promise<TransportResult> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetch(url, { method: 'GET', headers, signal: controller?.signal });
    if (!response.ok) {
      return { status: response.status, data: null };
    }
    const data = responseType === 'arraybuffer' ? await response.arrayBuffer() : await response.json();
    return { status: response.status, data };
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    throw new Error(
      isAbort
        ? `timed out after ${Math.round(timeoutMs / 1000)}s`
        : err instanceof Error
          ? err.message
          : 'network request failed'
    );
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Transport B: React Native XMLHttpRequest (RN NetworkingModule) — independent of Expo fetch. */
function xhrTransport(
  url: string,
  headers: Record<string, string>,
  timeoutMs: number,
  responseType: 'json' | 'arraybuffer'
): Promise<TransportResult> {
  return new Promise((resolve, reject) => {
    if (typeof XMLHttpRequest === 'undefined') {
      reject(new Error('XMLHttpRequest unavailable'));
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.timeout = timeoutMs;
    xhr.responseType = responseType === 'arraybuffer' ? 'arraybuffer' : 'text';
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        resolve({ status: xhr.status, data: null });
        return;
      }
      try {
        const data =
          responseType === 'arraybuffer' ? xhr.response : JSON.parse(xhr.responseText || 'null');
        resolve({ status: xhr.status, data });
      } catch {
        reject(new Error('invalid JSON response'));
      }
    };
    xhr.ontimeout = () => reject(new Error(`timed out after ${Math.round(timeoutMs / 1000)}s`));
    xhr.onerror = () => reject(new Error('network request failed'));
    xhr.onabort = () => reject(new Error('request aborted'));
    xhr.send();
  });
}

/**
 * Tries Expo fetch first, then falls back to RN XHR so a single broken native transport
 * can never silently block the Hub catalog.
 */
async function requestWithTransportFallback(
  url: string,
  headers: Record<string, string>,
  timeoutMs: number,
  responseType: 'json' | 'arraybuffer'
): Promise<TransportResult> {
  try {
    return await fetchTransport(url, headers, timeoutMs, responseType);
  } catch (fetchErr) {
    const fetchMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    console.warn(`[hfClient] fetch transport failed (${fetchMsg}); retrying via XHR: ${url}`);
    try {
      return await xhrTransport(url, headers, timeoutMs, responseType);
    } catch (xhrErr) {
      const xhrMsg = xhrErr instanceof Error ? xhrErr.message : String(xhrErr);
      throw new Error(`fetch: ${fetchMsg} · xhr: ${xhrMsg}`);
    }
  }
}

/**
 * Hugging Face client with dual native transports (Expo fetch → RN XHR) and an automatic
 * public-mirror fallback when huggingface.co is unreachable from the current network.
 */
export const hfClient = {
  async get<T>(urlOrPath: string, config: HfRequestConfig = {}): Promise<HfResponse<T>> {
    const responseType = config.responseType ?? 'json';
    const timeoutMs = config.timeout ?? 12000;
    const headers: Record<string, string> = {
      Accept: responseType === 'arraybuffer' ? '*/*' : 'application/json',
      ...(config.headers ?? {}),
    };

    const primaryUrl = resolveUrl(urlOrPath, activeBaseUrl);
    let result: TransportResult;

    try {
      result = await requestWithTransportFallback(primaryUrl, headers, timeoutMs, responseType);
    } catch (primaryErr) {
      const primaryMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
      const isHubOrigin = primaryUrl.startsWith(HF_BASE_URL);

      if (!isHubOrigin || activeBaseUrl === HF_MIRROR_URL) {
        console.warn(`[hfClient] request failed: ${primaryMsg} (${primaryUrl})`);
        throw new HfHttpError(primaryMsg, primaryUrl);
      }

      // huggingface.co unreachable via both transports → try public mirror once with short timeout
      const mirrorUrl = swapOrigin(primaryUrl, HF_MIRROR_URL);
      console.warn(`[hfClient] huggingface.co unreachable (${primaryMsg}); trying mirror ${mirrorUrl}`);
      try {
        result = await requestWithTransportFallback(
          mirrorUrl,
          headers,
          Math.min(timeoutMs, 6000),
          responseType
        );
        if (result.status >= 200 && result.status < 300) {
          activeBaseUrl = HF_MIRROR_URL;
        }
      } catch (mirrorErr) {
        const mirrorMsg = mirrorErr instanceof Error ? mirrorErr.message : String(mirrorErr);
        throw new HfHttpError(`huggingface.co: ${primaryMsg} | mirror: ${mirrorMsg}`, primaryUrl);
      }
    }

    if (result.status < 200 || result.status >= 300) {
      console.warn(`[hfClient] HTTP ${result.status} (${primaryUrl})`);
      throw new HfHttpError(`HTTP ${result.status} from Hugging Face Hub`, primaryUrl, result.status);
    }

    return { data: result.data as T, status: result.status };
  },
};

/**
 * Probes general internet vs Hugging Face reachability so failures explain exactly what is blocked.
 */
export async function diagnoseHubConnectivity(): Promise<string> {
  const probe = async (url: string): Promise<boolean> => {
    try {
      const res = await requestWithTransportFallback(url, {}, 6000, 'arraybuffer');
      return res.status > 0 && res.status < 500;
    } catch {
      return false;
    }
  };

  const [internetOk, hubOk, mirrorOk] = await Promise.all([
    probe('https://clients3.google.com/generate_204'),
    probe(`${HF_BASE_URL}/api/models?limit=1`),
    probe(`${HF_MIRROR_URL}/api/models?limit=1`),
  ]);

  if (!internetOk && !hubOk && !mirrorOk) {
    return 'The app has no internet access on this network. Check Wi-Fi/mobile data, VPN, Private DNS, or Data Saver restrictions for Aura OS.';
  }
  if (!hubOk && !mirrorOk) {
    return 'Internet works, but Hugging Face is blocked by your carrier or network. Turn on a VPN, switch networks, or try Private DNS (1.1.1.1 / dns.google) and tap Retry.';
  }
  if (!hubOk && mirrorOk) {
    return 'huggingface.co is blocked on this network; the public mirror is reachable — tap Retry to use it.';
  }
  return 'Hugging Face is reachable but the catalog query timed out. Tap Retry on a stronger connection.';
}

export interface HfRetryOptions {
  retries?: number;
  baseDelayMs?: number;
}

/** Retries only server-side throttling/errors (429/5xx); transport failures already fall back internally. */
export async function withHfRetry<T>(
  fn: () => Promise<T>,
  options: HfRetryOptions = {}
): Promise<T> {
  const retries = options.retries ?? 1;
  const baseDelayMs = options.baseDelayMs ?? 600;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = err instanceof HfHttpError ? err.status : undefined;
      const retriable = status === 429 || (status !== undefined && status >= 500);
      if (!retriable || attempt === retries) break;
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 250);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
