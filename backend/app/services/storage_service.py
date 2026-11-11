"""
Storage service — semua operasi Cloudflare R2.
Lifecycle: temp/ (TTL 1 jam) → permanent/ (saat user pilih varian) → exported/ (saat export).
"""
import logging
import time
import uuid
from datetime import datetime, timezone

import boto3
from botocore.client import Config

from app.config import settings
from app.utils import images
from app.utils.exceptions import AppError, ErrorCode

logger = logging.getLogger(__name__)


def _get_client():
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.cloudflare_r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.cloudflare_r2_access_key,
        aws_secret_access_key=settings.cloudflare_r2_secret_key,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


def _asset_path(key: str) -> str:
    """Return the ROOT-RELATIVE path for an object key (leading slash), e.g.
    "permanent/thumbnails/u/p.png" -> "/permanent/thumbnails/u/p.png".

    We deliberately store the relative path — NOT an absolute URL — in the DB so
    the public host is never baked into persisted data. The frontend prepends the
    public CDN base (NEXT_PUBLIC_CDN_URL, e.g. https://cdn.calira.my.id) at render
    time. The leading slash is also required by cleanup_service (`"/temp/" in url`)
    and by generate_service._resolve_thematic_image (urlparse().path parsing).
    """
    return f"/{key}"


def upload_temp(file_data: bytes, session_id: str, content_type: str = "image/png") -> str:
    """Upload ke temp/thematic-images/{session_id}/{timestamp}.png."""
    timestamp = int(datetime.now(timezone.utc).timestamp() * 1000)
    key = f"temp/thematic-images/{session_id}/{timestamp}.png"
    try:
        client = _get_client()
        client.put_object(
            Bucket=settings.cloudflare_r2_bucket_name,
            Key=key,
            Body=file_data,
            ContentType=content_type,
        )
        return _asset_path(key)
    except Exception as e:
        logger.error("upload_temp failed for session %s: %s", session_id, e)
        raise AppError(500, ErrorCode.STORAGE_UPLOAD_FAILED, "Gagal upload file ke storage.")


def move_to_permanent(temp_key: str, user_id: str, project_id: str) -> str:
    """Copy dari temp/ ke permanent/thematic-images/{user_id}/{project_id}.png, lalu delete temp."""
    permanent_key = f"permanent/thematic-images/{user_id}/{project_id}.png"
    try:
        client = _get_client()
        client.copy_object(
            Bucket=settings.cloudflare_r2_bucket_name,
            CopySource={"Bucket": settings.cloudflare_r2_bucket_name, "Key": temp_key},
            Key=permanent_key,
        )
        client.delete_object(Bucket=settings.cloudflare_r2_bucket_name, Key=temp_key)
        return _asset_path(permanent_key)
    except Exception as e:
        logger.error("move_to_permanent failed temp_key=%s: %s", temp_key, e)
        raise AppError(500, ErrorCode.STORAGE_UPLOAD_FAILED, "Gagal memindahkan file ke permanent storage.")


def upload_permanent_thematic(file_data: bytes, user_id: str, project_id: str, content_type: str = "image/png") -> str:
    """Upload langsung ke permanent/thematic-images/{user_id}/{project_id}.png.
    Dipakai saat user re-generate gambar dari editor (bukan dari generate session).
    """
    key = f"permanent/thematic-images/{user_id}/{project_id}.png"
    try:
        client = _get_client()
        client.put_object(
            Bucket=settings.cloudflare_r2_bucket_name,
            Key=key,
            Body=file_data,
            ContentType=content_type,
        )
        return _asset_path(key)
    except Exception as e:
        logger.error("upload_permanent_thematic failed project_id=%s: %s", project_id, e)
        raise AppError(500, ErrorCode.STORAGE_UPLOAD_FAILED, "Gagal upload gambar ke storage.")


def upload_thumbnail(file_data: bytes, user_id: str, project_id: str, content_type: str = "image/png") -> str:
    """Upload canvas snapshot ke permanent/thumbnails/{user_id}/{project_id}.png.
    Dipanggil setelah setiap auto-save dari editor agar thumbnail tetap sinkron.
    """
    key = f"permanent/thumbnails/{user_id}/{project_id}.png"
    try:
        client = _get_client()
        client.put_object(
            Bucket=settings.cloudflare_r2_bucket_name,
            Key=key,
            Body=file_data,
            ContentType=content_type,
        )
        return _asset_path(key)
    except Exception as e:
        logger.error("upload_thumbnail failed project_id=%s: %s", project_id, e)
        raise AppError(500, ErrorCode.STORAGE_UPLOAD_FAILED, "Gagal upload thumbnail.")


def upload_exported(file_data: bytes, user_id: str, project_id: str, content_type: str = "image/png") -> str:
    """Upload export final ke permanent/exported/{user_id}/{project_id}/export.png."""
    key = f"permanent/exported/{user_id}/{project_id}/export.png"
    try:
        client = _get_client()
        client.put_object(
            Bucket=settings.cloudflare_r2_bucket_name,
            Key=key,
            Body=file_data,
            ContentType=content_type,
        )
        return _asset_path(key)
    except Exception as e:
        logger.error("upload_exported failed project_id=%s: %s", project_id, e)
        raise AppError(500, ErrorCode.STORAGE_UPLOAD_FAILED, "Gagal upload file export.")


def upload_logo(user_id: str, file_bytes: bytes) -> str:
    """Normalize + upload ke permanent/logos/{user_id}/logo.png (key deterministik → overwrite,
    tanpa file orphan). Return path + query version (`?v={epoch}`) untuk cache busting CDN."""
    normalized = images.normalize_logo_image(file_bytes)
    key = f"permanent/logos/{user_id}/logo.png"
    try:
        client = _get_client()
        client.put_object(
            Bucket=settings.cloudflare_r2_bucket_name,
            Key=key,
            Body=normalized,
            ContentType="image/png",
        )
        version = int(time.time())
        return f"{_asset_path(key)}?v={version}"
    except Exception as e:
        logger.error("upload_logo failed for user %s: %s", user_id, e)
        raise AppError(500, ErrorCode.STORAGE_UPLOAD_FAILED, "Gagal upload logo ke storage.")


def upload_content_image(user_id: str, file_bytes: bytes) -> str:
    """Normalize + upload gambar konten user ke permanent/uploads/{user_id}/{uuid}.png.

    Key-nya random (bukan deterministik seperti logo): satu user bisa punya banyak gambar
    konten sekaligus, jadi upload baru tidak boleh menimpa yang sedang dipakai project lain.
    """
    normalized = images.normalize_content_image(file_bytes)
    key = f"permanent/uploads/{user_id}/{uuid.uuid4()}.png"
    try:
        client = _get_client()
        client.put_object(
            Bucket=settings.cloudflare_r2_bucket_name,
            Key=key,
            Body=normalized,
            ContentType="image/png",
        )
        return _asset_path(key)
    except Exception as e:
        logger.error("upload_content_image failed for user %s: %s", user_id, e)
        raise AppError(500, ErrorCode.STORAGE_UPLOAD_FAILED, "Gagal upload gambar ke storage.")


TEMPLATE_IMAGE_KINDS = ("thumbnail", "background")


def upload_template_image(template_id: str, kind: str, file_bytes: bytes) -> str:
    """Normalize + upload gambar template ke permanent/templates/{thumbnails|backgrounds}/{id}.png.
    Key deterministik per template → upload ulang menimpa (tanpa orphan); `?v=` untuk cache busting."""
    normalized = images.normalize_content_image(file_bytes)
    key = f"permanent/templates/{kind}s/{template_id}.png"
    try:
        client = _get_client()
        client.put_object(
            Bucket=settings.cloudflare_r2_bucket_name,
            Key=key,
            Body=normalized,
            ContentType="image/png",
        )
        return f"{_asset_path(key)}?v={int(time.time())}"
    except Exception as e:
        logger.error("upload_template_image failed template=%s kind=%s: %s", template_id, kind, e)
        raise AppError(500, ErrorCode.STORAGE_UPLOAD_FAILED, "Gagal upload gambar template ke storage.")


def upload_payment_proof(file_data: bytes, user_id: str, order_id: str, ext: str, content_type: str) -> str:
    """Upload bukti transfer ke permanent/payment-proofs/{user_id}/{order_id}.{ext}."""
    key = f"permanent/payment-proofs/{user_id}/{order_id}.{ext}"
    try:
        client = _get_client()
        client.put_object(
            Bucket=settings.cloudflare_r2_bucket_name,
            Key=key,
            Body=file_data,
            ContentType=content_type,
        )
        return _asset_path(key)
    except Exception as e:
        logger.error("upload_payment_proof failed order_id=%s: %s", order_id, e)
        raise AppError(500, ErrorCode.STORAGE_UPLOAD_FAILED, "Gagal upload bukti transfer.")


def get_object(key: str) -> tuple[bytes, str] | None:
    """Baca objek dari R2. Return (bytes, content_type), atau None bila tidak ada.

    Dipakai proxy aset — CDN publik tidak mengirim header CORS, sedangkan canvas
    Fabric butuh gambar yang boleh dibaca lintas origin agar export tidak tainted.
    """
    try:
        client = _get_client()
        obj = client.get_object(Bucket=settings.cloudflare_r2_bucket_name, Key=key)
        return obj["Body"].read(), obj.get("ContentType") or "application/octet-stream"
    except Exception:
        logger.info("get_object miss for key=%s", key)
        return None


def delete_file(key: str) -> None:
    """Hapus file dari R2. Dipakai oleh cron cleanup dan saat temp expired."""
    try:
        client = _get_client()
        client.delete_object(Bucket=settings.cloudflare_r2_bucket_name, Key=key)
    except Exception as e:
        logger.error("delete_file failed key=%s: %s", key, e)


# Prefix R2 yang isinya milik satu user. Dipakai saat akun dihapus.
# Catatan: `temp/` tidak ikut — key-nya di-index per session_id, bukan user_id,
# dan sudah dibersihkan cron cleanup lewat expires_at.
_USER_PREFIXES = (
    "permanent/thematic-images/{uid}/",
    "permanent/thumbnails/{uid}/",
    "permanent/exported/{uid}/",
    "permanent/logos/{uid}/",
    "permanent/uploads/{uid}/",
    "permanent/payment-proofs/{uid}/",
)

# delete_objects menolak lebih dari 1000 key per panggilan.
_DELETE_BATCH = 1000


def delete_user_prefix(prefix: str) -> int:
    """Hapus seluruh objek di bawah `prefix`. Return jumlah objek terhapus.

    Tidak pernah raise — penghapusan akun sudah menghapus baris DB-nya, jadi
    kegagalan R2 tidak boleh membatalkan operasi yang sudah terlanjur commit.
    """
    try:
        client = _get_client()
        bucket = settings.cloudflare_r2_bucket_name
        keys: list[dict] = []
        for page in client.get_paginator("list_objects_v2").paginate(
            Bucket=bucket, Prefix=prefix
        ):
            keys.extend({"Key": o["Key"]} for o in page.get("Contents", []))

        for i in range(0, len(keys), _DELETE_BATCH):
            client.delete_objects(
                Bucket=bucket, Delete={"Objects": keys[i : i + _DELETE_BATCH]}
            )
        return len(keys)
    except Exception as e:
        logger.error("delete_user_prefix failed prefix=%s: %s", prefix, e)
        return 0


def delete_user_files(user_id: str) -> int:
    """Bersihkan semua file milik user di R2. Return total objek terhapus."""
    total = sum(delete_user_prefix(p.format(uid=user_id)) for p in _USER_PREFIXES)
    logger.info("delete_user_files user_id=%s deleted=%d", user_id, total)
    return total


# ── Ringkasan pemakaian bucket (A-10) ─────────────────────────────────────

# Kategori di bawah permanent/ yang segmen ketiganya adalah user_id.
_PER_USER_CATEGORIES = {
    "thematic-images", "thumbnails", "exported", "logos", "uploads", "payment-proofs",
}

SCAN_MAX_OBJECTS = 50_000


def _is_uuid(value: str) -> bool:
    try:
        uuid.UUID(value)
        return True
    except ValueError:
        return False


def aggregate_usage(objects) -> dict:
    """Kelompokkan objek R2 per prefix 2-segmen & per user. Fungsi murni (mudah diuji).

    `objects`: iterable dict {"Key", "Size"} seperti dari list_objects_v2.
    """
    prefixes: dict[str, dict] = {}
    users: dict[str, dict] = {}
    total_objects = total_bytes = 0
    for obj in objects:
        key, size = obj["Key"], int(obj.get("Size", 0))
        parts = key.split("/")
        prefix = "/".join(parts[:2])
        p = prefixes.setdefault(prefix, {"prefix": prefix, "objects": 0, "bytes": 0})
        p["objects"] += 1
        p["bytes"] += size
        if len(parts) >= 4 and parts[0] == "permanent" and parts[1] in _PER_USER_CATEGORIES and _is_uuid(parts[2]):
            u = users.setdefault(parts[2], {"user_id": parts[2], "objects": 0, "bytes": 0})
            u["objects"] += 1
            u["bytes"] += size
        total_objects += 1
        total_bytes += size
    by_size = lambda d: -d["bytes"]  # noqa: E731
    return {
        "prefixes": sorted(prefixes.values(), key=by_size),
        "users": sorted(users.values(), key=by_size),
        "total_objects": total_objects,
        "total_bytes": total_bytes,
    }


def scan_usage(max_objects: int = SCAN_MAX_OBJECTS) -> dict:
    """Pindai bucket (sinkron — panggil lewat asyncio.to_thread). Dibatasi max_objects
    supaya bucket besar tidak membuat request admin menggantung; `truncated` menandainya."""
    client = _get_client()
    collected: list[dict] = []
    truncated = False
    for page in client.get_paginator("list_objects_v2").paginate(Bucket=settings.cloudflare_r2_bucket_name):
        for obj in page.get("Contents", []):
            if len(collected) >= max_objects:
                truncated = True
                break
            collected.append(obj)
        if truncated:
            break
    return {**aggregate_usage(collected), "truncated": truncated}
