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
        assert "session-123" in url

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
