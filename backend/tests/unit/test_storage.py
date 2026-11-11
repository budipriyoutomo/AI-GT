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


class TestDeleteUserPrefix:
    """P2-5 — hapus akun harus ikut membersihkan file user di R2.
    Paginasi dipakai karena list_objects_v2 dibatasi 1000 objek per respons."""

    def test_deletes_every_object_under_prefix(self):
        mock_client = MagicMock()
        paginator = MagicMock()
        paginator.paginate.return_value = [
            {"Contents": [
                {"Key": "permanent/uploads/u1/a.png"},
                {"Key": "permanent/uploads/u1/b.png"},
            ]},
        ]
        mock_client.get_paginator.return_value = paginator
        mock_client.delete_objects.return_value = {}

        with patch.object(storage_service, "_get_client", return_value=mock_client):
            with patch.object(storage_service, "settings", _mock_settings()):
                deleted = storage_service.delete_user_prefix("permanent/uploads/u1/")

        assert deleted == 2
        paginator.paginate.assert_called_once_with(
            Bucket=_BUCKET, Prefix="permanent/uploads/u1/"
        )
        mock_client.delete_objects.assert_called_once_with(
            Bucket=_BUCKET,
            Delete={"Objects": [
                {"Key": "permanent/uploads/u1/a.png"},
                {"Key": "permanent/uploads/u1/b.png"},
            ]},
        )

    def test_batches_deletes_in_chunks_of_1000(self):
        """delete_objects menerima maksimal 1000 key per panggilan."""
        keys = [{"Key": f"permanent/exported/u1/{i}.png"} for i in range(1500)]
        mock_client = MagicMock()
        paginator = MagicMock()
        paginator.paginate.return_value = [{"Contents": keys}]
        mock_client.get_paginator.return_value = paginator

        with patch.object(storage_service, "_get_client", return_value=mock_client):
            with patch.object(storage_service, "settings", _mock_settings()):
                deleted = storage_service.delete_user_prefix("permanent/exported/u1/")

        assert deleted == 1500
        assert mock_client.delete_objects.call_count == 2
        first = mock_client.delete_objects.call_args_list[0].kwargs["Delete"]["Objects"]
        second = mock_client.delete_objects.call_args_list[1].kwargs["Delete"]["Objects"]
        assert len(first) == 1000
        assert len(second) == 500

    def test_empty_prefix_makes_no_delete_call(self):
        mock_client = MagicMock()
        paginator = MagicMock()
        paginator.paginate.return_value = [{}]  # tanpa key "Contents"
        mock_client.get_paginator.return_value = paginator

        with patch.object(storage_service, "_get_client", return_value=mock_client):
            with patch.object(storage_service, "settings", _mock_settings()):
                deleted = storage_service.delete_user_prefix("permanent/logos/u1/")

        assert deleted == 0
        mock_client.delete_objects.assert_not_called()

    def test_swallows_error(self):
        """Kegagalan R2 tidak boleh menggagalkan penghapusan akun."""
        mock_client = MagicMock()
        mock_client.get_paginator.side_effect = Exception("R2 down")

        with patch.object(storage_service, "_get_client", return_value=mock_client):
            with patch.object(storage_service, "settings", _mock_settings()):
                assert storage_service.delete_user_prefix("permanent/uploads/u1/") == 0


class TestDeleteUserFiles:
    """Semua prefix milik user ikut terhapus — tidak ada yang tertinggal."""

    def test_covers_all_five_user_prefixes(self):
        with patch.object(storage_service, "delete_user_prefix", return_value=0) as m:
            storage_service.delete_user_files("u1")

        called = {c.args[0] for c in m.call_args_list}
        assert called == {
            "permanent/thematic-images/u1/",
            "permanent/thumbnails/u1/",
            "permanent/exported/u1/",
            "permanent/logos/u1/",
            "permanent/uploads/u1/",
            "permanent/payment-proofs/u1/",
        }
