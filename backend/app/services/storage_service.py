"""
Storage service — semua operasi Cloudflare R2.
Lifecycle: temp/ (TTL 1 jam) → permanent/ (saat user pilih varian) → exported/ (saat export).
"""
import logging
from datetime import datetime, timezone

import boto3
from botocore.client import Config

from app.config import settings
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


def _public_url(key: str) -> str:
    return f"https://{settings.cloudflare_r2_bucket_name}.{settings.cloudflare_r2_account_id}.r2.cloudflarestorage.com/{key}"


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
        return _public_url(key)
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
        return _public_url(permanent_key)
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
        return _public_url(key)
    except Exception as e:
        logger.error("upload_permanent_thematic failed project_id=%s: %s", project_id, e)
        raise AppError(500, ErrorCode.STORAGE_UPLOAD_FAILED, "Gagal upload gambar ke storage.")


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
        return _public_url(key)
    except Exception as e:
        logger.error("upload_exported failed project_id=%s: %s", project_id, e)
        raise AppError(500, ErrorCode.STORAGE_UPLOAD_FAILED, "Gagal upload file export.")


def delete_file(key: str) -> None:
    """Hapus file dari R2. Dipakai oleh cron cleanup dan saat temp expired."""
    try:
        client = _get_client()
        client.delete_object(Bucket=settings.cloudflare_r2_bucket_name, Key=key)
    except Exception as e:
        logger.error("delete_file failed key=%s: %s", key, e)
