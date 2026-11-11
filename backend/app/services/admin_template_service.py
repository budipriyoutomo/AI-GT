"""A-6 — Manajemen template & Template Lab.

Template Integrity (AGENTS.md §6/§10 #3): `template_config` template LIVE tidak pernah diubah.
Mengubah desain = duplikat ke draft → publish sebagai template BARU → template asal boleh
dinonaktifkan. Yang bisa di-PATCH di template live hanya metadata & gambar per baris.

Draft tidak di-audit (ruang kerja, tak terlihat user); publish, ubah metadata, upload gambar,
dan hapus template di-audit karena langsung mengubah galeri user.
"""
import copy
import re
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.generate_session import GenerateSession
from app.models.template import Template
from app.models.template_draft import TemplateDraft
from app.models.user import User
from app.services import audit_service, storage_service
from app.services.providers.copy_prompt import COPY_INTENT_GUIDANCE
from app.services.template_validation import validate_template_config
from app.utils.exceptions import AppError, ErrorCode

STATUS_FILTERS = ("all", "active", "inactive")
COPY_INTENTS = tuple(COPY_INTENT_GUIDANCE)
MVP_CONTENT_TYPE = "instagram_post"

_TEMPLATE_FIELDS = ("name", "industry", "theme", "copy_intent", "is_premium", "is_active")
_DRAFT_FIELDS = ("name", "industry", "theme", "copy_intent", "is_premium", "template_config")
_MAX_LEN = {"name": 100, "industry": 50, "theme": 50}

# Kerangka draft kosong — sengaja memakai preset supaya admin melihat cara kerjanya (README §8).
BLANK_CONFIG: dict = {
    "background": {"preset": "image-bg", "fallback": "#1F2937"},
    "palette": "editorial-dark",
    "font": {"family": "Montserrat"},
    "brand_theme": {"preset": "tint-accent"},
    "elements": [
        {"type": "logo", "source": "brand", "x": 0.06, "y": 0.05, "width": 0.18, "height": 0.08},
        {"type": "text", "role": "headline", "bind": "headline", "x": 0.06, "y": 0.55, "width": 0.88,
         "value": "Headline utama", "style": {"fontSize": 88, "weight": "800", "color": "primary"}},
        {"type": "text", "role": "body", "bind": "body", "x": 0.06, "y": 0.72, "width": 0.88,
         "value": "Kalimat pendukung yang menjelaskan penawaran.", "style": {"fontSize": 34, "color": "primary"}},
        {"type": "text", "role": "cta", "bind": "cta", "x": 0.06, "y": 0.83, "width": 0.88,
         "value": "Pesan sekarang", "stylePreset": "cta-pill"},
    ],
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _bad(message: str) -> AppError:
    return AppError(400, ErrorCode.VALIDATION_ERROR, message)


def _check_fields(body: dict, allowed: tuple[str, ...]) -> dict:
    """Validasi body PATCH di service supaya error-nya 400 berformat AGENTS.md §4."""
    if not isinstance(body, dict):
        raise _bad("Body harus berupa objek JSON.")
    unknown = sorted(set(body) - set(allowed))
    if unknown:
        raise _bad(f"Field tidak bisa diubah: {', '.join(unknown)}.")
    for key, value in body.items():
        if key in _MAX_LEN:
            if not isinstance(value, str) or len(value.strip()) > _MAX_LEN[key]:
                raise _bad(f"{key} harus teks maksimal {_MAX_LEN[key]} karakter.")
            body[key] = value.strip()
        elif key in ("is_premium", "is_active"):
            if not isinstance(value, bool):
                raise _bad(f"{key} harus true/false.")
        elif key == "copy_intent":
            if value is not None and value not in COPY_INTENTS:
                raise _bad(f"copy_intent harus salah satu: {', '.join(COPY_INTENTS)}.")
        elif key == "template_config":
            if not isinstance(value, dict):
                raise _bad("template_config harus berupa objek JSON.")
    return body


# ── Template live ─────────────────────────────────────────────────────────

async def _usage_counts(db: AsyncSession, ids: list[uuid.UUID]) -> dict[uuid.UUID, int]:
    if not ids:
        return {}
    rows = await db.execute(
        select(GenerateSession.template_id, func.count())
        .where(GenerateSession.template_id.in_(ids))
        .group_by(GenerateSession.template_id)
    )
    return dict(rows.all())


async def list_templates(db: AsyncSession, status: str = "all") -> list[tuple[Template, int]]:
    if status not in STATUS_FILTERS:
        raise _bad(f"status harus salah satu: {', '.join(STATUS_FILTERS)}.")
    stmt = select(Template).order_by(Template.created_at.desc())
    if status != "all":
        stmt = stmt.where(Template.is_active == (status == "active"))
    templates = list(await db.scalars(stmt))
    counts = await _usage_counts(db, [t.id for t in templates])
    return [(t, counts.get(t.id, 0)) for t in templates]


async def get_template(db: AsyncSession, template_id: uuid.UUID) -> Template:
    template = await db.get(Template, template_id)
    if template is None:
        raise AppError(404, ErrorCode.TEMPLATE_NOT_FOUND, "Template tidak ditemukan.")
    return template


async def usage_count(db: AsyncSession, template_id: uuid.UUID) -> int:
    return (await _usage_counts(db, [template_id])).get(template_id, 0)


async def update_template(db: AsyncSession, template_id: uuid.UUID, admin: User, body: dict) -> Template:
    template = await get_template(db, template_id)
    changes = {}
    for key, value in _check_fields(body, _TEMPLATE_FIELDS).items():
        if key in ("name", "industry", "theme") and not value:
            raise _bad(f"{key} tidak boleh kosong.")
        if key == "name" and value != template.name:
            await _assert_name_free(db, value, exclude_id=template.id, status=400)
        old = getattr(template, key)
        if old != value:
            changes[key] = {"from": old, "to": value}
            setattr(template, key, value)
    if changes:
        audit_service.record(db, admin, "template.update", "template", template.id, {"changes": changes})
        await db.commit()
        await db.refresh(template)
    return template


async def upload_image(
    db: AsyncSession, template_id: uuid.UUID, admin: User, kind: str, file_bytes: bytes
) -> Template:
    if kind not in storage_service.TEMPLATE_IMAGE_KINDS:
        raise _bad("kind harus thumbnail atau background.")
    template = await get_template(db, template_id)
    url = storage_service.upload_template_image(str(template.id), kind, file_bytes)
    column = f"{kind}_url"
    old = getattr(template, column)
    setattr(template, column, url)
    audit_service.record(db, admin, "template.upload_image", "template", template.id,
                         {"kind": kind, "from": old, "to": url})
    await db.commit()
    await db.refresh(template)
    return template


def _own_key(url: str | None) -> str | None:
    """Key R2 bila URL adalah gambar template yang dikelola panel admin."""
    if not url or not url.startswith("/permanent/templates/"):
        return None
    return url.split("?", 1)[0].lstrip("/")


async def delete_template(db: AsyncSession, template_id: uuid.UUID, admin: User) -> None:
    template = await get_template(db, template_id)
    if await usage_count(db, template.id):
        raise AppError(
            422, ErrorCode.TEMPLATE_IN_USE,
            "Template sudah dipakai untuk generate — nonaktifkan saja supaya riwayat user tetap utuh.",
        )
    keys = [k for k in (_own_key(template.thumbnail_url), _own_key(template.background_url)) if k]
    audit_service.record(db, admin, "template.delete", "template", template.id, {"name": template.name})
    await db.delete(template)
    await db.commit()

    # Versi baru menyalin URL gambar template asal — file yang masih dirujuk template lain dipertahankan.
    for key in keys:
        path = f"/{key}"
        shared = await db.scalar(
            select(func.count()).select_from(Template).where(
                or_(Template.thumbnail_url.startswith(path), Template.background_url.startswith(path))
            )
        )
        if not shared:
            try:
                storage_service.delete_file(key)
            except Exception:  # baris DB sudah hilang — bucket yang error tidak boleh membatalkannya
                pass


# ── Validasi ──────────────────────────────────────────────────────────────

def validate(body: dict) -> dict:
    if not isinstance(body, dict) or "template_config" not in body:
        raise _bad("template_config wajib diisi.")
    content_type = body.get("content_type", MVP_CONTENT_TYPE)
    result = validate_template_config(body["template_config"], content_type)
    return {
        "valid": result.valid,
        "errors": result.errors,
        "warnings": result.warnings,
        "resolved_config": result.resolved,
    }


# ── Draft ─────────────────────────────────────────────────────────────────

async def list_drafts(db: AsyncSession) -> list[TemplateDraft]:
    return list(await db.scalars(select(TemplateDraft).order_by(TemplateDraft.updated_at.desc())))


async def get_draft(db: AsyncSession, draft_id: uuid.UUID) -> TemplateDraft:
    draft = await db.get(TemplateDraft, draft_id)
    if draft is None:
        raise AppError(404, ErrorCode.TEMPLATE_DRAFT_NOT_FOUND, "Draft template tidak ditemukan.")
    return draft


async def create_draft(db: AsyncSession, admin: User, source_template_id: uuid.UUID | None) -> TemplateDraft:
    now = _now()
    draft = TemplateDraft(id=uuid.uuid4(), created_by=admin.id, created_at=now, updated_at=now,
                          content_type=MVP_CONTENT_TYPE)
    if source_template_id is None:
        draft.template_config = copy.deepcopy(BLANK_CONFIG)
    else:
        source = await get_template(db, source_template_id)
        draft.source_template_id = source.id
        draft.name = f"{source.name} (versi baru)"[:100]
        draft.industry = source.industry
        draft.theme = source.theme
        draft.copy_intent = source.copy_intent
        draft.is_premium = bool(source.is_premium)
        draft.template_config = copy.deepcopy(source.template_config)
        draft.thumbnail_url = source.thumbnail_url or None
        draft.background_url = source.background_url
    db.add(draft)
    await db.commit()
    await db.refresh(draft)
    return draft


async def update_draft(db: AsyncSession, draft_id: uuid.UUID, body: dict) -> TemplateDraft:
    draft = await get_draft(db, draft_id)
    for key, value in _check_fields(body, _DRAFT_FIELDS).items():
        setattr(draft, key, value)
    draft.updated_at = _now()
    await db.commit()
    await db.refresh(draft)
    return draft


async def delete_draft(db: AsyncSession, draft_id: uuid.UUID) -> None:
    await db.delete(await get_draft(db, draft_id))
    await db.commit()


async def _assert_name_free(db: AsyncSession, name: str, exclude_id: uuid.UUID | None = None, status: int = 422):
    stmt = select(Template.id).where(func.lower(Template.name) == name.lower())
    if exclude_id is not None:
        stmt = stmt.where(Template.id != exclude_id)
    if await db.scalar(stmt) is not None:
        code = ErrorCode.TEMPLATE_CONFIG_INVALID if status == 422 else ErrorCode.VALIDATION_ERROR
        # Seeder meng-upsert per `name`: nama ganda membuat JSON hasil unduh menimpa template lain.
        raise AppError(status, code, f"Nama template \"{name}\" sudah dipakai template lain.")


def _invalid(message: str) -> AppError:
    return AppError(422, ErrorCode.TEMPLATE_CONFIG_INVALID, message)


async def publish_draft(
    db: AsyncSession, draft_id: uuid.UUID, admin: User, deactivate_source: bool = False
) -> Template:
    draft = await get_draft(db, draft_id)
    missing = [k for k in ("name", "industry", "theme", "copy_intent") if not getattr(draft, k)]
    if missing:
        raise _invalid(f"Lengkapi metadata sebelum publish: {', '.join(missing)}.")
    result = validate_template_config(draft.template_config, draft.content_type)
    if not result.valid:
        raise _invalid("template_config belum valid: " + " ".join(result.errors))
    await _assert_name_free(db, draft.name)

    template = Template(
        id=uuid.uuid4(),
        name=draft.name,
        industry=draft.industry,
        theme=draft.theme,
        copy_intent=draft.copy_intent,
        content_type=draft.content_type,
        thumbnail_url=draft.thumbnail_url or "",  # kolom NOT NULL, sama seperti seeder
        background_url=draft.background_url,
        template_config=result.resolved,
        is_premium=draft.is_premium,
        is_active=True,
        created_at=_now(),
    )
    db.add(template)

    payload: dict = {
        "name": template.name,
        "source_template_id": str(draft.source_template_id) if draft.source_template_id else None,
    }
    if deactivate_source and draft.source_template_id:
        source = await db.get(Template, draft.source_template_id)
        if source is not None and source.is_active:
            source.is_active = False  # hanya metadata — config template asal tidak disentuh
            payload["deactivated_source"] = str(source.id)

    audit_service.record(db, admin, "template.publish", "template", template.id, payload)
    await db.delete(draft)
    await db.commit()
    await db.refresh(template)
    return template


# ── Export JSON (format seed_template_data) ───────────────────────────────

def _slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "template"


def export_seed(row: Template | TemplateDraft, source: str) -> dict:
    """Satu file seed_template_data/*.json. Gambar dikosongkan: di-upload per baris (README §7)."""
    content = {
        "_meta": {"exported_from": source, "exported_at": _now().isoformat()},
        "name": row.name,
        "industry": row.industry,
        "theme": row.theme,
        "content_type": row.content_type,
        "copy_intent": row.copy_intent,
        "thumbnail_url": None,
        "background_url": None,
        "is_premium": bool(row.is_premium),
        "template_config": row.template_config,
    }
    return {"filename": f"{_slug(row.name)}.json", "content": content}
