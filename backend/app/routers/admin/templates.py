"""A-6 — Manajemen template & Template Lab (draft → publish).

Body PATCH diterima sebagai dict dan divalidasi di service, supaya field terlarang
(`template_config` template live) ditolak 400 berformat AGENTS.md §4.
"""
import uuid

from fastapi import APIRouter, Body, Depends, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.template import Template
from app.models.user import User
from app.schemas.admin import AdminTemplateData, TemplateDraftData
from app.services import admin_template_service as svc
from app.utils.auth import get_current_admin
from app.utils.exceptions import AppError, ErrorCode

router = APIRouter(prefix="/templates", dependencies=[Depends(get_current_admin)])
drafts_router = APIRouter(prefix="/template-drafts", dependencies=[Depends(get_current_admin)])


def _template(t: Template, usage: int) -> dict:
    return AdminTemplateData(
        id=t.id, name=t.name, industry=t.industry, theme=t.theme, copy_intent=t.copy_intent,
        content_type=t.content_type, thumbnail_url=t.thumbnail_url or "", background_url=t.background_url,
        template_config=t.template_config, is_premium=bool(t.is_premium), is_active=bool(t.is_active),
        created_at=t.created_at, usage_count=usage,
    ).model_dump(mode="json")


async def _template_out(db: AsyncSession, t: Template) -> dict:
    return _template(t, await svc.usage_count(db, t.id))


def _draft(d) -> dict:
    return TemplateDraftData.model_validate(d, from_attributes=True).model_dump(mode="json")


# ── Template live ─────────────────────────────────────────────────────────

@router.get("")
async def list_templates(status: str = "all", db: AsyncSession = Depends(get_db)):
    rows = await svc.list_templates(db, status)
    return {"success": True, "data": {"items": [_template(t, n) for t, n in rows]}}


@router.post("/validate")
async def validate_config(body: dict = Body(default_factory=dict)):
    return {"success": True, "data": svc.validate(body)}


@router.get("/{template_id}")
async def get_template(template_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return {"success": True, "data": await _template_out(db, await svc.get_template(db, template_id))}


@router.patch("/{template_id}")
async def update_template(
    template_id: uuid.UUID,
    body: dict = Body(default_factory=dict),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    t = await svc.update_template(db, template_id, admin, body)
    return {"success": True, "data": await _template_out(db, t)}


@router.post("/{template_id}/image")
async def upload_image(
    template_id: uuid.UUID,
    kind: str,
    file: UploadFile = File(...),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    t = await svc.upload_image(db, template_id, admin, kind, await file.read())
    return {"success": True, "data": await _template_out(db, t)}


@router.delete("/{template_id}")
async def delete_template(
    template_id: uuid.UUID,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    await svc.delete_template(db, template_id, admin)
    return {"success": True, "data": None, "message": "Template dihapus."}


@router.get("/{template_id}/export")
async def export_template(template_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return {"success": True, "data": svc.export_seed(await svc.get_template(db, template_id), "template")}


# ── Draft ─────────────────────────────────────────────────────────────────

@drafts_router.get("")
async def list_drafts(db: AsyncSession = Depends(get_db)):
    return {"success": True, "data": {"items": [_draft(d) for d in await svc.list_drafts(db)]}}


@drafts_router.post("", status_code=201)
async def create_draft(
    body: dict = Body(default_factory=dict),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    raw = body.get("source_template_id") if isinstance(body, dict) else None
    try:
        source_id = uuid.UUID(str(raw)) if raw else None
    except ValueError:
        raise AppError(400, ErrorCode.VALIDATION_ERROR, "source_template_id tidak valid.")
    return {"success": True, "data": _draft(await svc.create_draft(db, admin, source_id))}


@drafts_router.get("/{draft_id}")
async def get_draft(draft_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return {"success": True, "data": _draft(await svc.get_draft(db, draft_id))}


@drafts_router.patch("/{draft_id}")
async def update_draft(draft_id: uuid.UUID, body: dict = Body(default_factory=dict), db: AsyncSession = Depends(get_db)):
    return {"success": True, "data": _draft(await svc.update_draft(db, draft_id, body))}


@drafts_router.delete("/{draft_id}")
async def delete_draft(draft_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    await svc.delete_draft(db, draft_id)
    return {"success": True, "data": None, "message": "Draft dihapus."}


@drafts_router.post("/{draft_id}/publish", status_code=201)
async def publish_draft(
    draft_id: uuid.UUID,
    body: dict = Body(default_factory=dict),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    deactivate = bool(body.get("deactivate_source")) if isinstance(body, dict) else False
    t = await svc.publish_draft(db, draft_id, admin, deactivate)
    return {"success": True, "data": await _template_out(db, t)}


@drafts_router.get("/{draft_id}/export")
async def export_draft(draft_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return {"success": True, "data": svc.export_seed(await svc.get_draft(db, draft_id), "draft")}
