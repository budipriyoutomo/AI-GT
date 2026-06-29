"""
Generate service — orchestrasi session, AI call (background), dan pilih varian.
"""
import asyncio
import logging
import uuid
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from urllib.parse import urlparse

from app.models.company_profile import CompanyProfile
from app.models.generate_session import GenerateSession
from app.models.generate_variant import GenerateVariant
from app.models.project import Project
from app.models.template import Template
from app.schemas.generate import CreateSessionRequest
from app.services import ai_service, storage_service
from app.services.providers.ai_types import CopyError, CopyInput, ImageInput
from app.utils.exceptions import AppError, ErrorCode

logger = logging.getLogger(__name__)

_SESSION_TTL_HOURS = 1


async def create_session(
    db: AsyncSession, user_id: uuid.UUID, data: CreateSessionRequest
) -> GenerateSession:
    # Premium gating: campaign_data non-null = Campaign feature (not available to free users)
    if data.campaign_data is not None:
        raise AppError(
            403,
            ErrorCode.FEATURE_REQUIRES_PREMIUM,
            "Fitur Campaign membutuhkan akun premium.",
        )

    # Validate image source mutual exclusivity
    if data.image_source == "generated" and not data.thematic_image_theme:
        raise AppError(400, ErrorCode.AI_GENERATION_FAILED, "thematic_image_theme wajib diisi jika image_source = 'generated'.")
    if data.image_source == "none" and (data.thematic_image_theme or data.selected_image_prompt):
        raise AppError(400, ErrorCode.AI_GENERATION_FAILED, "thematic_image_theme dan selected_image_prompt harus kosong jika image_source = 'none'.")

    template = await db.scalar(
        select(Template).where(Template.id == data.template_id, Template.is_active == True)  # noqa: E712
    )
    if not template:
        raise AppError(404, ErrorCode.TEMPLATE_NOT_FOUND, "Template tidak ditemukan.")

    profile = await db.scalar(
        select(CompanyProfile).where(CompanyProfile.user_id == user_id)
    )
    if not profile:
        raise AppError(404, ErrorCode.PROFILE_NOT_FOUND, "Lengkapi company profile terlebih dahulu.")

    content_data = {
        "product_or_service": data.product_or_service,
        "key_message": data.key_message,
        "image_source": data.image_source,
    }
    if data.promo_detail:
        content_data["promo_detail"] = data.promo_detail
    if data.additional_notes:
        content_data["additional_notes"] = data.additional_notes
    if data.selected_image_prompt:
        content_data["selected_image_prompt"] = data.selected_image_prompt

    session = GenerateSession(
        id=uuid.uuid4(),
        user_id=user_id,
        template_id=data.template_id,
        language_style=data.language_style,
        goal=data.goal,
        platform=data.platform,
        thematic_image_theme=data.thematic_image_theme,
        content_data=content_data,
        campaign_data=None,  # Quick Generate always null
        status="processing",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=_SESSION_TTL_HOURS),
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def get_session(db: AsyncSession, session_id: uuid.UUID, user_id: uuid.UUID) -> GenerateSession:
    session = await db.scalar(
        select(GenerateSession)
        .where(GenerateSession.id == session_id)
        .options(
            selectinload(GenerateSession.variants),
            selectinload(GenerateSession.project),
        )
    )
    if not session:
        raise AppError(404, ErrorCode.SESSION_NOT_FOUND, "Session tidak ditemukan.")
    if session.user_id != user_id:
        raise AppError(403, ErrorCode.SESSION_NOT_FOUND, "Akses ditolak.")
    if session.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise AppError(422, ErrorCode.SESSION_EXPIRED, "Session sudah expired.")
    return session


async def select_variant(
    db: AsyncSession, user_id: uuid.UUID, session_id: uuid.UUID, variant_id: uuid.UUID
) -> Project:
    session = await get_session(db, session_id, user_id)

    if session.status != "completed":
        raise AppError(422, ErrorCode.SESSION_NOT_FOUND, "Session belum selesai generate.")

    variant = await db.scalar(
        select(GenerateVariant).where(
            GenerateVariant.id == variant_id,
            GenerateVariant.session_id == session_id,
        )
    )
    if not variant:
        raise AppError(404, ErrorCode.VARIANT_NOT_SELECTED, "Varian tidak ditemukan.")

    variant.is_selected = True
    project_id = uuid.uuid4()

    thematic_url = await _resolve_thematic_image(variant.thematic_image_url, str(user_id), str(project_id))

    content = session.content_data or {}
    campaign = session.campaign_data or {}
    image_source = content.get("image_source") or campaign.get("image_source", "none")
    image_prompt = content.get("selected_image_prompt") or campaign.get("image_prompt", "")

    template = await db.get(Template, session.template_id)
    template_cfg = template.template_config if template else {}

    product = (content.get("product_or_service") or campaign.get("product_or_service") or "").strip()
    title = product[:50] if product else (template.name if template else "Project")

    final_config: dict = {
        "copy": variant.copy_data,
        "typography": variant.typography_data,
        "thematic_image_url": thematic_url,
        "image_source": image_source,
        "image_prompt": image_prompt,
        "template_config": {
            "name": template.name if template else "",
            "content_type": template.content_type if template else "Single",
            "slide_count": int(template_cfg.get("slide_count", 1)),
            "background": template_cfg.get("background", {"type": "color", "value": "#F9FAFB"}),
            "color_scheme": template_cfg.get("color_scheme", {"primary": "#6366F1", "secondary": "#FFFFFF", "accent": "#6366F1"}),
            "layout": template_cfg.get("layout", ""),
        },
    }

    project = Project(
        id=project_id,
        user_id=user_id,
        session_id=session_id,
        variant_id=variant_id,
        title=title,
        final_config=final_config,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


async def _resolve_thematic_image(thematic_url: str | None, user_id: str, project_id: str) -> str | None:
    """Move temp image to permanent storage, or return as-is if already permanent or external."""
    if not thematic_url:
        return None
    try:
        path_key = urlparse(thematic_url).path.lstrip("/")
        if path_key.startswith("temp/"):
            return storage_service.move_to_permanent(path_key, user_id, project_id)
        elif not path_key.startswith("permanent/"):
            return await _persist_image_permanent(thematic_url, user_id, project_id)
    except Exception:
        logger.warning("_resolve_thematic_image failed for user=%s project=%s", user_id, project_id)
    return thematic_url


async def regenerate_project_image(
    db: AsyncSession,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    prompt: str,
) -> str | None:
    """Generate image baru via AI, upload ke R2 permanent, update final_config project."""
    from sqlalchemy import select as _select
    from app.models.project import Project as ProjectModel

    raw_url = await ai_service.generate_single_image(prompt)
    if not raw_url:
        return None

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(raw_url)
            resp.raise_for_status()
        loop = asyncio.get_event_loop()
        r2_url = await loop.run_in_executor(
            None,
            storage_service.upload_permanent_thematic,
            resp.content,
            str(user_id),
            str(project_id),
        )
    except Exception as e:
        logger.warning("regenerate_project_image: upload failed, using raw URL: %s", e)
        r2_url = raw_url

    project = await db.scalar(
        _select(ProjectModel).where(
            ProjectModel.id == project_id,
            ProjectModel.user_id == user_id,
        )
    )
    if project:
        config = dict(project.final_config)
        config["thematic_image_url"] = r2_url
        project.final_config = config
        await db.commit()

    return r2_url


async def _persist_image(url: str, session_id: str) -> str:
    """Download image dari provider URL dan upload ke R2 temp. Fallback ke URL asli jika gagal."""
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url)
            resp.raise_for_status()
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, storage_service.upload_temp, resp.content, session_id
        )
    except Exception as e:
        logger.warning("persist_image failed for session %s: %s — using raw URL", session_id, e)
        return url


async def _persist_image_permanent(url: str, user_id: str, project_id: str) -> str:
    """Download image dari URL eksternal dan upload langsung ke R2 permanent."""
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url)
            resp.raise_for_status()
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, storage_service.upload_permanent_thematic, resp.content, user_id, project_id
        )
    except Exception as e:
        logger.warning("persist_image_permanent failed user=%s project=%s: %s — using raw URL", user_id, project_id, e)
        return url


async def run_generation_task(session_id: uuid.UUID) -> None:
    """Background task — dipanggil setelah create_session return. Buat DB session sendiri."""
    from app.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        await _do_generate(db, session_id)


async def _do_generate(db: AsyncSession, session_id: uuid.UUID) -> None:
    session = await db.scalar(
        select(GenerateSession).where(GenerateSession.id == session_id)
    )
    if not session or session.status != "processing":
        return

    template = await db.get(Template, session.template_id)
    profile = await db.scalar(
        select(CompanyProfile).where(CompanyProfile.user_id == session.user_id)
    )
    if not template or not profile:
        session.status = "failed"
        await db.commit()
        return

    content = session.content_data or {}
    campaign = session.campaign_data or {}
    image_source = content.get("image_source") or campaign.get("image_source", "none")
    language_preference = campaign.get("language_preference") or profile.language_preference

    template_cfg = template.template_config or {}
    content_type = template.content_type or "Single"   # "Single" | "Carousel"
    slide_count = int(template_cfg.get("slide_count", 1))

    copy_input = CopyInput(
        business_name=profile.business_name,
        industry=profile.industry,
        brand_colors=profile.brand_colors,
        language_style=session.language_style,
        language_preference=language_preference,
        template_theme=template.theme,
        goal=session.goal,
        platform=session.platform,
        product_or_service=content.get("product_or_service"),
        key_message=content.get("key_message"),
        promo_detail=content.get("promo_detail"),
        additional_notes=content.get("additional_notes"),
        campaign_data=campaign if campaign else None,
        content_type=content_type,
        slide_count=slide_count,
    )

    image_prompt = content.get("selected_image_prompt") or campaign.get("image_prompt") or template.theme
    image_input = ImageInput(theme=image_prompt) if image_source == "generated" else None

    try:
        copy_result, image_result = await ai_service.generate_content(
            copy_input, image_input, str(session_id)
        )
    except CopyError as e:
        logger.error("Copy generation failed for session %s: %s", session_id, e)
        session.status = "failed"
        await db.commit()
        return

    for variant_data in copy_result.variants:
        idx = variant_data.variant_number - 1
        raw_url = image_result.image_urls[idx] if idx < len(image_result.image_urls) else None
        image_url = await _persist_image(raw_url, str(session_id)) if raw_url else None
        variant = GenerateVariant(
            id=uuid.uuid4(),
            session_id=session_id,
            variant_number=variant_data.variant_number,
            copy_data=variant_data.copy,
            typography_data=variant_data.typography,
            thematic_image_url=image_url,
        )
        db.add(variant)

    session.status = "completed"
    await db.commit()

    # Quick Generate: auto-select the single variant and create a project
    if session.campaign_data is None:
        await _auto_select_first_variant(db, session)


async def _auto_select_first_variant(db: AsyncSession, session: GenerateSession) -> None:
    """For Quick Generate: auto-select the single variant and create a project record."""
    variant = await db.scalar(
        select(GenerateVariant).where(GenerateVariant.session_id == session.id)
    )
    if not variant:
        logger.warning("_auto_select_first_variant: no variant found for session %s", session.id)
        return

    variant.is_selected = True
    project_id = uuid.uuid4()

    thematic_url = await _resolve_thematic_image(
        variant.thematic_image_url, str(session.user_id), str(project_id)
    )

    content = session.content_data or {}

    template = await db.get(Template, session.template_id)
    template_cfg = template.template_config if template else {}

    product = (content.get("product_or_service") or "").strip()
    title = product[:50] if product else (template.name if template else "Project")

    final_config: dict = {
        "copy": variant.copy_data,
        "typography": variant.typography_data,
        "thematic_image_url": thematic_url,
        "image_source": content.get("image_source", "none"),
        "image_prompt": content.get("selected_image_prompt", ""),
        "template_config": {
            "name": template.name if template else "",
            "content_type": template.content_type if template else "Single",
            "slide_count": int(template_cfg.get("slide_count", 1)),
            "background": template_cfg.get("background", {"type": "color", "value": "#F9FAFB"}),
            "color_scheme": template_cfg.get("color_scheme", {"primary": "#6366F1", "secondary": "#FFFFFF", "accent": "#6366F1"}),
            "layout": template_cfg.get("layout", ""),
        },
    }

    project = Project(
        id=project_id,
        user_id=session.user_id,
        session_id=session.id,
        variant_id=variant.id,
        title=title,
        final_config=final_config,
    )
    db.add(project)
    await db.commit()
    logger.info("auto_select: project %s created for session %s", project_id, session.id)
