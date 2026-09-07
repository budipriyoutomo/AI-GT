import logging

from fastapi import APIRouter, Response

from app.services import storage_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/assets", tags=["assets"])

# Proxy hanya boleh membaca folder aset — bukan seluruh bucket.
ALLOWED_PREFIXES = ("permanent/", "temp/")

# Aset di-key dengan UUID/timestamp (immutable), jadi boleh di-cache lama.
CACHE_CONTROL = "public, max-age=31536000, immutable"


@router.get("/{key:path}")
async def get_asset(key: str) -> Response:
    """Sajikan objek R2 dari origin backend supaya CORSMiddleware memasang
    `Access-Control-Allow-Origin`. Canvas Fabric memuat gambar dengan
    `crossOrigin="anonymous"`; tanpa header itu canvas ter-taint dan gambar
    dibuang dari PNG hasil export.

    Publik (tanpa auth): dipanggil oleh <img>/Image() yang tidak bisa mengirim
    Authorization header. Key-nya sendiri berisi UUID yang tidak bisa ditebak.
    """
    if not key.startswith(ALLOWED_PREFIXES) or ".." in key:
        return Response(status_code=404)

    obj = storage_service.get_object(key)
    if obj is None:
        return Response(status_code=404)

    data, content_type = obj
    return Response(
        content=data,
        media_type=content_type,
        headers={"Cache-Control": CACHE_CONTROL},
    )
