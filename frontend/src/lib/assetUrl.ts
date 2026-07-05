/**
 * Resolve a stored asset reference into a loadable URL.
 *
 * Backend storage (thumbnails, thematic images, exports) is persisted as a
 * ROOT-RELATIVE path (e.g. "/permanent/thumbnails/u/p.png") — the public host is
 * NOT baked into the DB. This prepends the public CDN base at render time.
 *
 * Absolute URLs (template sample images, external provider URLs) are returned
 * unchanged, so this is safe to apply uniformly to any image reference.
 */
const CDN_BASE = (process.env.NEXT_PUBLIC_CDN_URL ?? "https://cdn.calira.my.id").replace(/\/+$/, "");

export function resolveAssetUrl(ref: string | null | undefined): string | null {
  if (!ref) return null;
  if (/^(https?:)?\/\//i.test(ref) || ref.startsWith("data:") || ref.startsWith("blob:")) {
    return ref; // already absolute / inline
  }
  const path = ref.startsWith("/") ? ref : `/${ref}`;
  return `${CDN_BASE}${path}`;
}
