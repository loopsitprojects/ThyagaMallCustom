export const BASE_PATH = '/thyaga';

/**
 * Returns the proper subpath URL for public assets when hosted under a subfolder
 */
export function getAssetUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (cleanPath.startsWith(`${BASE_PATH}/`)) {
    return cleanPath;
  }
  return `${BASE_PATH}${cleanPath}`;
}
