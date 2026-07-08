import { env } from '@/config/env';

// env.API_URL looks like 'http://10.0.2.2:4000/api/v1' — origin is everything
// before the '/api/v1' suffix. Reused so a relative '/media/...' path (the
// LocalDiskStorageProvider default — see backend shared/src/storage) resolves
// against whichever host this device actually reached the gateway on.
const API_ORIGIN = env.API_URL.replace(/\/api\/v1\/?$/, '');

/**
 * Resolves a possibly-relative media path (e.g. '/media/avatars/...') into an
 * absolute URL an <Image> can load. Already-absolute URLs (legacy Cloudinary
 * https:// URLs, or a production PUBLIC_MEDIA_BASE_URL) pass through unchanged.
 */
export function buildMediaUrl(
  path: string | null | undefined,
): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}
