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

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");

/**
 * Versi URL yang boleh dibaca lintas origin — untuk canvas Fabric.
 *
 * CDN publik tidak mengirim header CORS, jadi `crossOrigin="anonymous"` gagal dan
 * canvas jadi tainted → gambar dibuang dari PNG hasil export. Proxy backend
 * (`GET /api/v1/assets/{key}`) menyajikan objek yang sama lewat CORSMiddleware.
 *
 * Hanya aset milik kita yang dialihkan; data URL dan host pihak ketiga dibiarkan
 * (mengalihkannya cuma menambah hop, dan proxy memang menolak key di luar bucket).
 */
export function corsSafeAssetUrl(ref: string | null | undefined): string | null {
  if (!ref) return null;
  if (ref.startsWith("data:") || ref.startsWith("blob:")) return ref;

  const path = ref.startsWith(CDN_BASE)
    ? ref.slice(CDN_BASE.length)
    : /^(https?:)?\/\//i.test(ref)
      ? null // host pihak ketiga — bukan aset kita
      : ref.startsWith("/")
        ? ref
        : `/${ref}`;

  return path === null ? ref : `${API_BASE}/api/v1/assets${path}`;
}
