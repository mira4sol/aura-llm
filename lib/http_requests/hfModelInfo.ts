import { buildQueryString, hfClient, withHfRetry } from './hfClient';
import type { HfModelRaw } from './hfModelSearch';

export async function fetchHfModelInfo(repoId: string): Promise<HfModelRaw> {
  const query = buildQueryString([
    ['expand[]', 'gguf'],
    ['expand[]', 'siblings'],
    ['expand[]', 'tags'],
    ['expand[]', 'pipeline_tag'],
    ['expand[]', 'downloads'],
    ['expand[]', 'likes'],
    ['expand[]', 'lastModified'],
    ['expand[]', 'cardData'],
  ]);

  return withHfRetry(async () => {
    const { data } = await hfClient.get<HfModelRaw>(`/api/models/${repoId}?${query}`);
    return data;
  });
}
