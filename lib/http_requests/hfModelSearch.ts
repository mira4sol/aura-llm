import { buildQueryString, hfClient, withHfRetry } from './hfClient';

export interface HfSiblingRaw {
  rfilename: string;
  size?: number;
  lfs?: {
    oid?: string;
    sha256?: string;
    size?: number;
  };
}

export interface HfGgufSummaryRaw {
  total?: number;
  architecture?: string;
  context_length?: number;
  chat_template?: string;
  bos_token?: string;
  eos_token?: string;
}

export interface HfModelRaw {
  id: string;
  modelId?: string;
  author?: string;
  pipeline_tag?: string;
  tags?: string[];
  downloads?: number;
  likes?: number;
  lastModified?: string;
  gguf?: HfGgufSummaryRaw;
  siblings?: HfSiblingRaw[];
  cardData?: {
    license?: string | string[];
    pipeline_tag?: string;
    tags?: string[];
  };
  gated?: boolean | string;
  private?: boolean;
}

export interface HfSearchParams {
  search?: string;
  filter?: string | string[];
  author?: string;
  sort?: 'downloads' | 'likes' | 'lastModified' | 'trendingScore';
  direction?: -1 | 1;
  limit?: number;
}

export async function searchHfModels(params: HfSearchParams): Promise<HfModelRaw[]> {
  const entries: [string, string][] = [];
  if (params.search?.trim()) entries.push(['search', params.search.trim()]);
  if (params.author) entries.push(['author', params.author]);
  if (params.filter) {
    const filters = Array.isArray(params.filter) ? params.filter : [params.filter];
    for (const f of filters) entries.push(['filter', f]);
  }
  entries.push(['sort', params.sort ?? 'downloads']);
  entries.push(['direction', String(params.direction ?? -1)]);
  entries.push(['limit', String(params.limit ?? 35)]);
  entries.push(['expand[]', 'gguf']);
  entries.push(['expand[]', 'siblings']);
  entries.push(['expand[]', 'tags']);
  entries.push(['expand[]', 'pipeline_tag']);
  entries.push(['expand[]', 'downloads']);
  entries.push(['expand[]', 'likes']);
  entries.push(['expand[]', 'lastModified']);
  entries.push(['expand[]', 'cardData']);
  entries.push(['expand[]', 'gated']);

  return withHfRetry(async () => {
    const { data } = await hfClient.get<HfModelRaw[]>(`/api/models?${buildQueryString(entries)}`);
    return Array.isArray(data) ? data.filter((m) => !m.gated && !m.private) : [];
  });
}
