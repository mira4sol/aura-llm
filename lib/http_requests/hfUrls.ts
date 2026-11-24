import { getHfBaseUrl } from './hfClient';

export function buildHfResolveUrl(repoId: string, filePath: string, revision = 'main'): string {
  const encodedPath = filePath
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
  return `${getHfBaseUrl()}/${repoId}/resolve/${encodeURIComponent(revision)}/${encodedPath}?download=true`;
}

export function buildHfRepoUrl(repoId: string): string {
  return `${getHfBaseUrl()}/${repoId}`;
}
