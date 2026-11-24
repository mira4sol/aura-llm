import { hfClient, withHfRetry } from './hfClient';

export interface HfTreeEntry {
  type: 'file' | 'directory';
  path: string;
  size?: number;
  oid?: string;
  lfs?: {
    oid: string;
    size: number;
    pointerSize?: number;
  };
}

export async function fetchHfRepoTree(
  repoId: string,
  revision = 'main'
): Promise<HfTreeEntry[]> {
  return withHfRetry(async () => {
    const { data } = await hfClient.get<HfTreeEntry[]>(
      `/api/models/${repoId}/tree/${encodeURIComponent(revision)}?recursive=true`
    );
    return Array.isArray(data) ? data.filter((e) => e.type === 'file') : [];
  });
}
