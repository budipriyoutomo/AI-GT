"""
A-6 — Manajemen template (Template Lab) di panel admin.
🔴 RED phase: ditulis sebelum router admin/templates & tabel template_drafts ada.

Keputusan desain (2026-10-22):
- template_config template LIVE tidak pernah diubah (AGENTS.md §6/§10 #3). "Edit" = duplikat ke draft →
  publish sebagai template baru → template asal boleh dinonaktifkan.
- Sumber kebenaran = DB; publish memakai resolver preset yang sama dengan seeder. JSON seed bisa diunduh.
"""
import uuid
from io import BytesIO
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from PIL import Image
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin_audit_log import AdminAuditLog
from app.models.template import Template
from app.models.template_draft import TemplateDraft
from app.services import storage_service

URL = "/api/v1/admin/templates"
DRAFTS = "/api/v1/admin/template-drafts"


def _png() -> bytes:
    buf = BytesIO()
    Image.new("RGB", (40, 50), "red").save(buf, format="PNG")
    return buf.getvalue()


def _config() -> dict:
    return {
        "background": {"preset": "image-bg", "fallback": "#111111"},
        "palette": "promo-red",
        "font": {"family": "Montserrat"},
        "brand_theme": {"preset": "tint-accent"},
        "elements": [
            {"type": "text", "role": "headline", "bind": "headline", "x": 0.06, "y": 0.3, "width": 0.88,
             "value": "Judul", "stylePreset": "glossy-headline"},
        ],
    }


async def _audit(db: AsyncSession, action: str) -> list[AdminAuditLog]:
    return list(await db.scalars(select(AdminAuditLog).where(AdminAuditLog.action == action)))


async def _create_draft(client: AsyncClient, headers: dict, **body) -> dict:
    res = await client.post(DRAFTS, json=body, headers=headers)
    assert res.status_code == 201, res.text
    return res.json()["data"]


async def _ready_draft(client: AsyncClient, headers: dict, name: str = "Promo Baru") -> dict:
    draft = await _create_draft(client, headers)
    res = await client.patch(f"{DRAFTS}/{draft['id']}", headers=headers, json={
        "name": name, "industry": "fnb", "theme": "promo", "copy_intent": "promotion",
        "is_premium": True, "template_config": _config(),
    })
    assert res.status_code == 200, res.text
    return res.json()["data"]


# ── Otorisasi ─────────────────────────────────────────────────────────────

class TestAuthorization:
    @pytest.mark.parametrize("method,path", [
        ("get", URL), ("post", f"{URL}/validate"), ("get", DRAFTS), ("post", DRAFTS),
    ])
    async def test_requires_token(self, client: AsyncClient, method, path):
        res = await getattr(client, method)(path)
        assert res.status_code == 401

    @pytest.mark.parametrize("method,path", [
        ("get", URL), ("get", DRAFTS),
    ])
    async def test_regular_user_forbidden(self, client: AsyncClient, auth_headers, method, path):
        res = await getattr(client, method)(path, headers=auth_headers)
        assert res.status_code == 403
        assert res.json()["error"]["code"] == "ADMIN_FORBIDDEN"


# ── Daftar & detail template live ─────────────────────────────────────────

class TestListTemplates:
    async def test_includes_inactive_and_usage(self, client, admin_headers, db, sample_template, completed_session):
        db.add(Template(
            id=uuid.uuid4(), name="Lama", industry="fnb", theme="x", content_type="instagram_post",
            thumbnail_url="", template_config=_config(), is_active=False,
        ))
        await db.commit()

        res = await client.get(URL, headers=admin_headers)
        assert res.status_code == 200
        items = {t["name"]: t for t in res.json()["data"]["items"]}
        assert set(items) == {"Template Lebaran FnB", "Lama"}
        assert items["Template Lebaran FnB"]["usage_count"] == 1
        assert items["Lama"]["usage_count"] == 0
        assert items["Lama"]["is_active"] is False
        assert "template_config" in items["Lama"]

    @pytest.mark.parametrize("status,expected", [("active", {"Template Lebaran FnB"}), ("inactive", {"Lama"})])
    async def test_status_filter(self, client, admin_headers, db, sample_template, status, expected):
        db.add(Template(
            id=uuid.uuid4(), name="Lama", industry="fnb", theme="x", content_type="instagram_post",
            thumbnail_url="", template_config=_config(), is_active=False,
        ))
        await db.commit()
        res = await client.get(URL, params={"status": status}, headers=admin_headers)
        assert {t["name"] for t in res.json()["data"]["items"]} == expected

    async def test_invalid_status(self, client, admin_headers):
        res = await client.get(URL, params={"status": "draft"}, headers=admin_headers)
        assert res.status_code == 400
        assert res.json()["error"]["code"] == "VALIDATION_ERROR"

    async def test_detail_not_found(self, client, admin_headers):
        res = await client.get(f"{URL}/{uuid.uuid4()}", headers=admin_headers)
        assert res.status_code == 404
        assert res.json()["error"]["code"] == "TEMPLATE_NOT_FOUND"


# ── PATCH metadata — template_config TIDAK bisa diubah ────────────────────

class TestUpdateTemplate:
    async def test_updates_metadata_and_audits(self, client, admin_headers, db, sample_template):
        res = await client.patch(f"{URL}/{sample_template.id}", headers=admin_headers,
                                 json={"is_active": False, "is_premium": True, "name": "Lebaran 2026"})
        assert res.status_code == 200
        data = res.json()["data"]
        assert (data["is_active"], data["is_premium"], data["name"]) == (False, True, "Lebaran 2026")

        logs = await _audit(db, "template.update")
        assert len(logs) == 1
        assert logs[0].payload["changes"]["is_active"] == {"from": True, "to": False}

    async def test_template_config_is_rejected(self, client, admin_headers, db, sample_template):
        """AGENTS.md §10 #3 — config template live tidak boleh dimodifikasi."""
        before = dict(sample_template.template_config)
        res = await client.patch(f"{URL}/{sample_template.id}", headers=admin_headers,
                                 json={"template_config": {"elements": []}})
        assert res.status_code == 400
        assert res.json()["error"]["code"] == "VALIDATION_ERROR"
        await db.refresh(sample_template)
        assert sample_template.template_config == before

    async def test_invalid_copy_intent(self, client, admin_headers, sample_template):
        res = await client.patch(f"{URL}/{sample_template.id}", headers=admin_headers, json={"copy_intent": "hard-sell"})
        assert res.status_code == 400

    async def test_inactive_template_hidden_from_users(self, client, admin_headers, auth_headers, sample_template):
        await client.patch(f"{URL}/{sample_template.id}", headers=admin_headers, json={"is_active": False})
        res = await client.get("/api/v1/templates", headers=auth_headers)
        assert sample_template.id.hex not in {t["id"].replace("-", "") for t in res.json()["data"]}

    async def test_not_found(self, client, admin_headers):
        res = await client.patch(f"{URL}/{uuid.uuid4()}", headers=admin_headers, json={"is_active": False})
        assert res.status_code == 404


# ── Upload gambar template ────────────────────────────────────────────────

class TestUploadImage:
    @pytest.mark.parametrize("kind,column", [("thumbnail", "thumbnail_url"), ("background", "background_url")])
    async def test_uploads_and_sets_column(self, client, admin_headers, db, sample_template, kind, column):
        with patch.object(storage_service, "upload_template_image", return_value=f"/permanent/templates/{kind}s/x.png?v=1") as up:
            res = await client.post(f"{URL}/{sample_template.id}/image", params={"kind": kind},
                                    files={"file": ("a.png", _png(), "image/png")}, headers=admin_headers)
        assert res.status_code == 200, res.text
        assert res.json()["data"][column] == f"/permanent/templates/{kind}s/x.png?v=1"
        assert up.call_args.args[:2] == (str(sample_template.id), kind)
        assert len(await _audit(db, "template.upload_image")) == 1

    async def test_invalid_kind(self, client, admin_headers, sample_template):
        res = await client.post(f"{URL}/{sample_template.id}/image", params={"kind": "logo"},
                                files={"file": ("a.png", _png(), "image/png")}, headers=admin_headers)
        assert res.status_code == 400

    async def test_invalid_file_type(self, client, admin_headers, sample_template):
        res = await client.post(f"{URL}/{sample_template.id}/image", params={"kind": "thumbnail"},
                                files={"file": ("a.txt", b"bukan gambar", "text/plain")}, headers=admin_headers)
        assert res.status_code == 400
        assert res.json()["error"]["code"] == "INVALID_FILE_TYPE"


class TestStorageTemplateImage:
    def test_key_is_deterministic_per_template_and_kind(self):
        with patch.object(storage_service, "_get_client") as gc:
            url = storage_service.upload_template_image("tpl-1", "background", _png())
        key = gc.return_value.put_object.call_args.kwargs["Key"]
        assert key == "permanent/templates/backgrounds/tpl-1.png"
        assert url.startswith("/permanent/templates/backgrounds/tpl-1.png?v=")

    def test_upload_failure(self):
        from app.utils.exceptions import AppError
        with patch.object(storage_service, "_get_client", side_effect=RuntimeError("down")):
            with pytest.raises(AppError) as exc:
                storage_service.upload_template_image("tpl-1", "thumbnail", _png())
        assert exc.value.code == "STORAGE_UPLOAD_FAILED"


# ── Hapus ─────────────────────────────────────────────────────────────────

class TestDeleteTemplate:
    async def test_in_use_cannot_be_deleted(self, client, admin_headers, sample_template, completed_session):
        res = await client.delete(f"{URL}/{sample_template.id}", headers=admin_headers)
        assert res.status_code == 422
        assert res.json()["error"]["code"] == "TEMPLATE_IN_USE"

    async def test_unused_is_deleted_with_own_images(self, client, admin_headers, db):
        t = Template(
            id=uuid.uuid4(), name="Hapus", industry="fnb", theme="x", content_type="instagram_post",
            thumbnail_url="/permanent/templates/thumbnails/a.png?v=1", background_url="/permanent/templates/backgrounds/a.png",
            template_config=_config(),
        )
        # Template lain berbagi background (versi baru menyalin URL) → file itu tidak boleh dihapus.
        db.add_all([t, Template(
            id=uuid.uuid4(), name="Versi 2", industry="fnb", theme="x", content_type="instagram_post",
            thumbnail_url="", background_url="/permanent/templates/backgrounds/a.png", template_config=_config(),
        )])
        await db.commit()

        with patch.object(storage_service, "delete_file") as rm:
            res = await client.delete(f"{URL}/{t.id}", headers=admin_headers)
        assert res.status_code == 200
        assert [c.args[0] for c in rm.call_args_list] == ["permanent/templates/thumbnails/a.png"]
        assert await db.get(Template, t.id) is None
        assert len(await _audit(db, "template.delete")) == 1

    async def test_storage_failure_does_not_undo_delete(self, client, admin_headers, db):
        t = Template(
            id=uuid.uuid4(), name="Hapus", industry="fnb", theme="x", content_type="instagram_post",
            thumbnail_url="/permanent/templates/thumbnails/b.png", template_config=_config(),
        )
        db.add(t)
        await db.commit()
        with patch.object(storage_service, "delete_file", side_effect=RuntimeError("down")):
            res = await client.delete(f"{URL}/{t.id}", headers=admin_headers)
        assert res.status_code == 200


# ── Validasi (preview realtime) ───────────────────────────────────────────

class TestValidateEndpoint:
    async def test_valid_returns_resolved_config(self, client, admin_headers):
        res = await client.post(f"{URL}/validate", headers=admin_headers, json={"template_config": _config()})
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["valid"] is True
        assert data["errors"] == []
        assert "palette" not in data["resolved_config"]
        assert data["resolved_config"]["canvas"]["aspect"] == "4:5"

    async def test_invalid_returns_errors_not_http_error(self, client, admin_headers):
        res = await client.post(f"{URL}/validate", headers=admin_headers, json={"template_config": {"elements": []}})
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["valid"] is False
        assert data["resolved_config"] is None
        assert data["errors"]

    async def test_body_required(self, client, admin_headers):
        res = await client.post(f"{URL}/validate", headers=admin_headers, json={})
        assert res.status_code == 400


# ── Draft ─────────────────────────────────────────────────────────────────

class TestDrafts:
    async def test_blank_draft_starts_from_valid_skeleton(self, client, admin_headers):
        draft = await _create_draft(client, admin_headers)
        assert draft["content_type"] == "instagram_post"
        assert draft["source_template_id"] is None
        res = await client.post(f"{URL}/validate", headers=admin_headers, json={"template_config": draft["template_config"]})
        assert res.json()["data"]["valid"] is True

    async def test_duplicate_from_live_template(self, client, admin_headers, sample_template):
        draft = await _create_draft(client, admin_headers, source_template_id=str(sample_template.id))
        assert draft["source_template_id"] == str(sample_template.id)
        assert draft["template_config"] == sample_template.template_config
        assert draft["thumbnail_url"] == sample_template.thumbnail_url
        assert draft["name"] == "Template Lebaran FnB (versi baru)"

    async def test_duplicate_from_missing_template(self, client, admin_headers):
        res = await client.post(DRAFTS, json={"source_template_id": str(uuid.uuid4())}, headers=admin_headers)
        assert res.status_code == 404
        assert res.json()["error"]["code"] == "TEMPLATE_NOT_FOUND"

    async def test_drafts_never_reach_user_gallery(self, client, admin_headers, auth_headers):
        await _ready_draft(client, admin_headers, name="Rahasia")
        res = await client.get("/api/v1/templates", headers=auth_headers)
        assert "Rahasia" not in {t["name"] for t in res.json()["data"]}

    async def test_update_list_get_delete(self, client, admin_headers, db):
        draft = await _ready_draft(client, admin_headers)
        assert draft["name"] == "Promo Baru"
        assert draft["template_config"] == _config()  # draft menyimpan config MENTAH (preset belum di-expand)

        res = await client.get(DRAFTS, headers=admin_headers)
        assert [d["id"] for d in res.json()["data"]["items"]] == [draft["id"]]

        res = await client.get(f"{DRAFTS}/{draft['id']}", headers=admin_headers)
        assert res.json()["data"]["name"] == "Promo Baru"

        res = await client.delete(f"{DRAFTS}/{draft['id']}", headers=admin_headers)
        assert res.status_code == 200
        assert await db.get(TemplateDraft, uuid.UUID(draft["id"])) is None

    async def test_draft_may_hold_invalid_config_while_editing(self, client, admin_headers):
        draft = await _create_draft(client, admin_headers)
        res = await client.patch(f"{DRAFTS}/{draft['id']}", headers=admin_headers, json={"template_config": {"elements": []}})
        assert res.status_code == 200

    async def test_config_must_be_object(self, client, admin_headers):
        draft = await _create_draft(client, admin_headers)
        res = await client.patch(f"{DRAFTS}/{draft['id']}", headers=admin_headers, json={"template_config": [1, 2]})
        assert res.status_code == 400

    async def test_not_found(self, client, admin_headers):
        res = await client.get(f"{DRAFTS}/{uuid.uuid4()}", headers=admin_headers)
        assert res.status_code == 404
        assert res.json()["error"]["code"] == "TEMPLATE_DRAFT_NOT_FOUND"


# ── Publish ───────────────────────────────────────────────────────────────

class TestPublish:
    async def test_publish_creates_live_template_with_resolved_config(self, client, admin_headers, auth_headers, db):
        draft = await _ready_draft(client, admin_headers)
        res = await client.post(f"{DRAFTS}/{draft['id']}/publish", headers=admin_headers, json={})
        assert res.status_code == 201, res.text
        tpl = res.json()["data"]
        assert tpl["name"] == "Promo Baru"
        assert tpl["is_active"] is True and tpl["is_premium"] is True
        assert tpl["copy_intent"] == "promotion"
        assert "palette" not in tpl["template_config"]  # preset di-expand seperti seeder
        assert tpl["template_config"]["elements"][0]["style"]  # stylePreset ter-expand

        assert await db.get(TemplateDraft, uuid.UUID(draft["id"])) is None
        logs = await _audit(db, "template.publish")
        assert len(logs) == 1 and logs[0].target_id == tpl["id"]

        gallery = await client.get("/api/v1/templates", headers=auth_headers)
        assert "Promo Baru" in {t["name"] for t in gallery.json()["data"]}

    async def test_new_version_can_deactivate_source(self, client, admin_headers, db, sample_template):
        draft = await _create_draft(client, admin_headers, source_template_id=str(sample_template.id))
        await client.patch(f"{DRAFTS}/{draft['id']}", headers=admin_headers,
                           json={"copy_intent": "promotion", "template_config": _config()})
        res = await client.post(f"{DRAFTS}/{draft['id']}/publish", headers=admin_headers, json={"deactivate_source": True})
        assert res.status_code == 201, res.text
        assert res.json()["data"]["thumbnail_url"] == sample_template.thumbnail_url

        await db.refresh(sample_template)
        assert sample_template.is_active is False
        log = (await _audit(db, "template.publish"))[0]
        assert log.payload["deactivated_source"] == str(sample_template.id)

    async def test_source_config_never_modified(self, client, admin_headers, db, sample_template):
        before = dict(sample_template.template_config)
        draft = await _create_draft(client, admin_headers, source_template_id=str(sample_template.id))
        await client.patch(f"{DRAFTS}/{draft['id']}", headers=admin_headers,
                           json={"copy_intent": "story", "template_config": _config()})
        await client.post(f"{DRAFTS}/{draft['id']}/publish", headers=admin_headers, json={"deactivate_source": True})
        await db.refresh(sample_template)
        assert sample_template.template_config == before

    async def test_invalid_config_blocks_publish(self, client, admin_headers, db):
        draft = await _ready_draft(client, admin_headers)
        await client.patch(f"{DRAFTS}/{draft['id']}", headers=admin_headers, json={"template_config": {"elements": []}})
        res = await client.post(f"{DRAFTS}/{draft['id']}/publish", headers=admin_headers, json={})
        assert res.status_code == 422
        assert res.json()["error"]["code"] == "TEMPLATE_CONFIG_INVALID"
        assert await db.get(TemplateDraft, uuid.UUID(draft["id"])) is not None

    @pytest.mark.parametrize("field,value", [("name", ""), ("industry", ""), ("theme", ""), ("copy_intent", None)])
    async def test_metadata_required(self, client, admin_headers, field, value):
        draft = await _ready_draft(client, admin_headers)
        await client.patch(f"{DRAFTS}/{draft['id']}", headers=admin_headers, json={field: value})
        res = await client.post(f"{DRAFTS}/{draft['id']}/publish", headers=admin_headers, json={})
        assert res.status_code == 422
        assert res.json()["error"]["code"] == "TEMPLATE_CONFIG_INVALID"

    async def test_duplicate_name_rejected(self, client, admin_headers, sample_template):
        """Seeder meng-upsert berdasarkan `name` — nama ganda membuat JSON hasil unduh menimpa template lain."""
        draft = await _ready_draft(client, admin_headers, name=sample_template.name)
        res = await client.post(f"{DRAFTS}/{draft['id']}/publish", headers=admin_headers, json={})
        assert res.status_code == 422
        assert "nama" in res.json()["error"]["message"].lower()


# ── Export JSON (format seed_template_data) ───────────────────────────────

class TestExport:
    async def test_export_live_template(self, client, admin_headers, sample_template):
        res = await client.get(f"{URL}/{sample_template.id}/export", headers=admin_headers)
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["filename"] == "template-lebaran-fnb.json"
        content = data["content"]
        assert content["name"] == sample_template.name
        assert content["template_config"] == sample_template.template_config
        # Gambar di-upload per baris oleh admin — JSON seed mengosongkannya (README §7).
        assert content["thumbnail_url"] is None and content["background_url"] is None
        assert "_meta" in content

    async def test_export_draft_keeps_raw_presets(self, client, admin_headers):
        draft = await _ready_draft(client, admin_headers)
        res = await client.get(f"{DRAFTS}/{draft['id']}/export", headers=admin_headers)
        assert res.json()["data"]["content"]["template_config"]["palette"] == "promo-red"

    async def test_export_is_seedable(self, client, admin_headers, tmp_path):
        """JSON hasil unduh harus bisa dibaca seeder apa adanya."""
        import json
        from scripts import seed_templates

        draft = await _ready_draft(client, admin_headers)
        content = (await client.get(f"{DRAFTS}/{draft['id']}/export", headers=admin_headers)).json()["data"]["content"]
        (tmp_path / "x.json").write_text(json.dumps(content))
        with patch.object(seed_templates, "DATA_DIR", str(tmp_path)):
            rows = seed_templates.load_templates()
        assert rows[0]["name"] == "Promo Baru"
        assert "palette" not in rows[0]["template_config"]
