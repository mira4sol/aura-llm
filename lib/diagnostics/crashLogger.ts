import { runtimeStorage } from '@/lib/storage';

export type CrashSource =
  | 'react_boundary'
  | 'global_js'
  | 'unhandled_rejection'
  | 'memory_pressure'
  | 'unexpected_termination';

export interface CrashRecord {
  id: string;
  timestamp: number;
  source: CrashSource;
  message: string;
  stack?: string;
  fatal: boolean;
  context?: Record<string, string | number | boolean | null>;
}

interface SessionBreadcrumb {
  startedAt: number;
  lastUpdatedAt: number;
  cleanExit: boolean;
  lastAction?: string;
  lastMemoryPressure?: string;
}

const MAX_RECORDS = 20;
const RECORDS_KEY = 'aura-crash-records-v1';
const SESSION_KEY = 'aura-session-breadcrumb-v1';

const diagnosticsStorage = runtimeStorage;

let handlersInstalled = false;

function readRecords(): CrashRecord[] {
  return diagnosticsStorage.getJSON<CrashRecord[]>(RECORDS_KEY) ?? [];
}

function writeRecords(records: CrashRecord[]): void {
  diagnosticsStorage.setJSON(RECORDS_KEY, records.slice(0, MAX_RECORDS));
}

export const crashLogger = {
  record(entry: Omit<CrashRecord, 'id' | 'timestamp'>): CrashRecord {
    const full: CrashRecord = {
      id: `cr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      ...entry,
    };
    const next = [full, ...readRecords()].slice(0, MAX_RECORDS);
    writeRecords(next);
    console.warn(`[AuraCrashLogger:${full.source}] ${full.message}`);
    return full;
  },

  listRecords(): CrashRecord[] {
    return readRecords();
  },

  clearRecords(): void {
    diagnosticsStorage.remove(RECORDS_KEY);
  },

  setBreadcrumb(patch: Partial<Pick<SessionBreadcrumb, 'lastAction' | 'lastMemoryPressure'>>): void {
    const prev = diagnosticsStorage.getJSON<SessionBreadcrumb>(SESSION_KEY) ?? {
      startedAt: Date.now(),
      lastUpdatedAt: Date.now(),
      cleanExit: false,
    };
    diagnosticsStorage.setJSON(SESSION_KEY, {
      ...prev,
      ...patch,
      lastUpdatedAt: Date.now(),
      cleanExit: false,
    });
  },

  markCleanBackground(): void {
    const prev = diagnosticsStorage.getJSON<SessionBreadcrumb>(SESSION_KEY);
    if (!prev) return;
    diagnosticsStorage.setJSON(SESSION_KEY, {
      ...prev,
      lastUpdatedAt: Date.now(),
      cleanExit: true,
    });
  },

  /**
   * Checks whether the previous foreground session terminated abruptly (e.g. Android LMK OOM
   * or native SIGSEGV) and records a structured diagnostic entry before starting a fresh session.
   */
  beginSession(): CrashRecord | null {
    const prev = diagnosticsStorage.getJSON<SessionBreadcrumb>(SESSION_KEY);
    let detected: CrashRecord | null = null;
    if (prev && !prev.cleanExit) {
      detected = this.record({
        source: 'unexpected_termination',
        fatal: true,
        message: `Previous session terminated unexpectedly (likely OS memory kill or native crash). Last action: ${prev.lastAction ?? 'unknown'}`,
        context: {
          lastAction: prev.lastAction ?? null,
          lastMemoryPressure: prev.lastMemoryPressure ?? null,
          previousStartedAt: prev.startedAt,
        },
      });
    }

    diagnosticsStorage.setJSON(SESSION_KEY, {
      startedAt: Date.now(),
      lastUpdatedAt: Date.now(),
      cleanExit: false,
      lastAction: 'app_launch',
    } satisfies SessionBreadcrumb);

    return detected;
  },

  /**
   * Installs global JS error and unhandled Promise rejection handlers once at app startup.
   */
  installGlobalHandlers(): void {
    if (handlersInstalled) return;
    handlersInstalled = true;

    const g = globalThis as unknown as {
      ErrorUtils?: {
        getGlobalHandler?: () => ((error: Error, isFatal?: boolean) => void) | undefined;
        setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
      };
      onunhandledrejection?: ((event: { reason?: unknown }) => void) | null;
    };

    const prevHandler = g.ErrorUtils?.getGlobalHandler?.();
    g.ErrorUtils?.setGlobalHandler?.((error: Error, isFatal?: boolean) => {
      this.record({
        source: 'global_js',
        fatal: Boolean(isFatal),
        message: error?.message || String(error),
        stack: error?.stack?.slice(0, 1500),
      });
      prevHandler?.(error, isFatal);
    });

    const prevRejection = g.onunhandledrejection;
    g.onunhandledrejection = (event: { reason?: unknown }) => {
      const reason = event?.reason;
      this.record({
        source: 'unhandled_rejection',
        fatal: false,
        message: reason instanceof Error ? reason.message : String(reason ?? 'Unhandled promise rejection'),
        stack: reason instanceof Error ? reason.stack?.slice(0, 1500) : undefined,
      });
      prevRejection?.(event);
    };
  },
};
