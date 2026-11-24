import type { ModelCapability, ModelRuntime, RemoteFile } from './models';

export type DownloadStatus =
  | 'queued'
  | 'preflight'
  | 'downloading'
  | 'paused_user'
  | 'waiting_network'
  | 'waiting_wifi'
  | 'retrying'
  | 'verifying'
  | 'assembling'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface DownloadSegment {
  index: number;
  start: number;
  end: number;
  tempPath: string;
  nativeTaskId?: string;
  bytesDone: number;
  status: 'pending' | 'active' | 'done' | 'error';
}

export interface DownloadFileState {
  remote: RemoteFile;
  url: string;
  destPath: string;
  segments: DownloadSegment[];
  bytesDone: number;
  status: 'pending' | 'active' | 'assembling' | 'verifying' | 'done' | 'error';
}

export interface DownloadError {
  code: string;
  message: string;
  retriable: boolean;
}

export interface DownloadTaskState {
  id: string;
  repoId: string;
  quant: string;
  displayName: string;
  runtime: ModelRuntime;
  capabilities: ModelCapability[];
  contextLength?: number;
  parameterCount?: number;
  architecture?: string;
  files: DownloadFileState[];
  totalBytes: number;
  bytesDone: number;
  status: DownloadStatus;
  speedBps: number;
  etaSec: number | null;
  attempt: number;
  nextRetryAt?: number;
  error?: DownloadError;
  createdAt: number;
  updatedAt: number;
  policy: {
    wifiOnly: boolean;
  };
}
