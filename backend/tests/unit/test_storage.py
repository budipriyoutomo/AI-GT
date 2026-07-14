"""
Test storage_service.py — boto3 di-mock, tidak ada network request ke R2.
"""
from unittest.mock import MagicMock, patch

import pytest

from app.services import storage_service
from app.utils.exceptions import AppError


_BUCKET = "ai-gt-bucket"
_ACCOUNT_ID = "test-account-id"


def _mock_settings():
    s = MagicMock()
    s.cloudflare_r2_bucket_name = _BUCKET
    s.cloudflare_r2_account_id = _ACCOUNT_ID
    s.cloudflare_r2_access_key = "key"
    s.cloudflare_r2_secret_key = "secret"
    return s


class TestAssetPath:
    """Storage functions must return a ROOT-RELATIVE path (leading slash, no host),
    so the public CDN domain is never baked into persisted DB values."""

    def test_returns_relative_path_with_leading_slash(self):
        assert storage_service._asset_path("permanent/thumbnails/u/p.png") == "/permanent/thumbnails/u/p.png"

    def test_upload_functions_never_return_absolute_url(self):
        mock_client = MagicMock()
        with patch.object(storage_service, "_get_client", return_value=mock_client):
            with patch.object(storage_service, "settings", _mock_settings()):
                with patch.object(storage_service.images, "normalize_logo_image", return_value=b"png-bytes"):
                    urls = [
                        storage_service.upload_temp(b"d", "s1"),
                        storage_service.move_to_permanent("temp/x.png", "u1", "p1"),
                        storage_service.upload_permanent_thematic(b"d", "u1", "p1"),
                        storage_service.upload_thumbnail(b"d", "u1", "p1"),
                        storage_service.upload_exported(b"d", "u1", "p1"),
                        storage_service.upload_logo("u1", b"d"),
                    ]
        for url in urls:
            assert url.startswith("/"), f"expected relative path, got {url!r}"
            assert "http" not in url
            assert "cloudflarestorage" not in url
            assert "cdn.calira" not in url


class TestUploadTemp:
    def test_upload_temp_success(self):
        mock_client = MagicMock()
        with patch.object(storage_service, "_get_client", return_value=mock_client):
            with patch.object(storage_service, "settings", _mock_settings()):
                url = storage_service.upload_temp(b"fake-image-data", "session-123")

        mock_client.put_object.assert_called_once()
        call_kwargs = mock_client.put_object.call_args.kwargs
        assert call_kwargs["Bucket"] == _BUCKET
        assert "temp/thematic-images/session-123/" in call_kwargs["Key"]
        assert call_kwargs["ContentType"] == "image/png"
        assert url == "/" + call_kwargs["Key"]

    def test_upload_temp_raises_on_failure(self):
        mock_client = MagicMock()
        mock_client.put_object.side_effect = Exception("R2 unreachable")
        with patch.object(storage_service, "_get_client", return_value=mock_client):
            with patch.object(storage_service, "settings", _mock_settings()):
                with pytest.raises(AppError) as exc_info:
                    storage_service.upload_temp(b"data", "session-123")

        assert exc_info.value.code == "STORAGE_UPLOAD_FAILED"
        assert exc_info.value.status_code == 500


class TestMoveToPermanent:
    def test_move_to_permanent_success(self):
        mock_client = MagicMock()
        with patch.object(storage_service, "_get_client", return_value=mock_client):
            with patch.object(storage_service, "settings", _mock_settings()):
                url = storage_service.move_to_permanent(
                    "temp/thematic-images/s1/123.png", "user-1", "project-1"
                )

        mock_client.copy_object.assert_called_once()
        mock_client.delete_object.assert_called_once()
        assert "permanent/thematic-images/user-1/project-1.png" in url

    def test_move_to_permanent_raises_on_failure(self):
        mock_client = MagicMock()
        mock_client.copy_object.side_effect = Exception("R2 error")
        with patch.object(storage_service, "_get_client", return_value=mock_client):
            with patch.object(storage_service, "settings", _mock_settings()):
                with pytest.raises(AppError) as exc_info:
                    storage_service.move_to_permanent("temp/x.png", "uid", "pid")

        assert exc_info.value.code == "STORAGE_UPLOAD_FAILED"


class TestUploadExported:
    def test_upload_exported_success(self):
        mock_client = MagicMock()
        with patch.object(storage_service, "_get_client", return_value=mock_client):
            with patch.object(storage_service, "settings", _mock_settings()):
                url = storage_service.upload_exported(b"png-data", "user-1", "project-1")

        mock_client.put_object.assert_called_once()
        assert "permanent/exported/user-1/project-1/export.png" in url

    def test_upload_exported_raises_on_failure(self):
        mock_client = MagicMock()
        mock_client.put_object.side_effect = Exception("upload failed")
        with patch.object(storage_service, "_get_client", return_value=mock_client):
            with patch.object(storage_service, "settings", _mock_settings()):
                with pytest.raises(AppError) as exc_info:
                    storage_service.upload_exported(b"data", "uid", "pid")

        assert exc_info.value.code == "STORAGE_UPLOAD_FAILED"


class TestUploadLogo:
    def test_upload_logo_success(self):
        mock_client = MagicMock()
        with patch.object(storage_service, "_get_client", return_value=mock_client):
            with patch.object(storage_service, "settings", _mock_settings()):
                with patch.object(storage_service.images, "normalize_logo_image", return_value=b"normalized-png"):
                    url = storage_service.upload_logo("user-1", b"raw-file-bytes")

        mock_client.put_object.assert_called_once()
        call_kwargs = mock_client.put_object.call_args.kwargs
        assert call_kwargs["Bucket"] == _BUCKET
        assert call_kwargs["Key"] == "permanent/logos/user-1/logo.png"
        assert call_kwargs["ContentType"] == "image/png"
        assert call_kwargs["Body"] == b"normalized-png"
        assert url.startswith("/permanent/logos/user-1/logo.png")
        assert "?v=" in url

    def test_upload_logo_twice_same_key_different_version(self):
        mock_client = MagicMock()
        with patch.object(storage_service, "_get_client", return_value=mock_client):
            with patch.object(storage_service, "settings", _mock_settings()):
                with patch.object(storage_service.images, "normalize_logo_image", return_value=b"normalized-png"):
                    with patch.object(storage_service.time, "time", side_effect=[100.0, 200.0]):
                        url1 = storage_service.upload_logo("user-1", b"raw-file-bytes")
                        url2 = storage_service.upload_logo("user-1", b"raw-file-bytes")

        keys = [c.kwargs["Key"] for c in mock_client.put_object.call_args_list]
        assert keys[0] == keys[1] == "permanent/logos/user-1/logo.png"
        assert url1 != url2
        assert "?v=100" in url1
        assert "?v=200" in url2

    def test_upload_logo_raises_on_storage_failure(self):
        mock_client = MagicMock()
        mock_client.put_object.side_effect = Exception("R2 unreachable")
        with patch.object(storage_service, "_get_client", return_value=mock_client):
            with patch.object(storage_service, "settings", _mock_settings()):
                with patch.object(storage_service.images, "normalize_logo_image", return_value=b"normalized-png"):
                    with pytest.raises(AppError) as exc_info:
                        storage_service.upload_logo("user-1", b"raw-file-bytes")

        assert exc_info.value.code == "STORAGE_UPLOAD_FAILED"
        assert exc_info.value.status_code == 500


class TestDeleteFile:
    def test_delete_file_success(self):
        mock_client = MagicMock()
        with patch.object(storage_service, "_get_client", return_value=mock_client):
            with patch.object(storage_service, "settings", _mock_settings()):
                storage_service.delete_file("temp/thematic-images/s1/123.png")

        mock_client.delete_object.assert_called_once_with(
            Bucket=_BUCKET, Key="temp/thematic-images/s1/123.png"
        )

    def test_delete_file_swallows_error(self):
        """delete_file tidak raise — log saja, caller tidak perlu handle."""
        mock_client = MagicMock()
        mock_client.delete_object.side_effect = Exception("not found")
        with patch.object(storage_service, "_get_client", return_value=mock_client):
            with patch.object(storage_service, "settings", _mock_settings()):
                storage_service.delete_file("temp/x.png")
