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

    session = GenerateSession(
        id=uuid.uuid4(),
        user_id=user_id,
        template_id=data.template_id,
        language_style=data.language_style,
        campaign_data=data.campaign_data.model_dump(exclude_none=True) if data.campaign_data else None,
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
        .options(selectinload(GenerateSession.variants))
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

    # Pastikan thematic image tersimpan di R2 permanent sebelum project dibuat.
    # Ada 3 kasus URL yang masuk:
    #   1. temp/ R2 URL  → move ke permanent/ (happy path)
    #   2. external URL (Replicate, dsb) → download + upload langsung ke permanent/
    #      (terjadi jika _persist_image gagal saat generate)
    #   3. permanent/ R2 URL → biarkan (sudah di tempat yang benar)
    thematic_url = variant.thematic_image_url
    if thematic_url:
        try:
            path_key = urlparse(thematic_url).path.lstrip("/")
            if path_key.startswith("temp/"):
                thematic_url = storage_service.move_to_permanent(
                    path_key, str(user_id), str(project_id)
                )
            elif not path_key.startswith("permanent/"):
                # URL eksternal — download dan upload langsung ke permanent
                thematic_url = await _persist_image_permanent(
                    thematic_url, str(user_id), str(project_id)
                )
            # else: sudah permanent/, tidak perlu tindakan
        except Exception:
            logger.warning(
                "select_variant: failed to persist thematic image, keeping original URL. "
                "session_id=%s variant_id=%s",
                session_id,
                variant_id,
            )

    campaign = session.campaign_data or {}
    image_source = campaign.get("image_source", "none")
    image_prompt = campaign.get("image_prompt", "")

    final_config: dict = {
        "copy": variant.copy_data,
        "typography": variant.typography_data,
        "thematic_image_url": thematic_url,
        "image_source": image_source,
        "image_prompt": image_prompt,
    }

    project = Project(
        id=project_id,
        user_id=user_id,
        session_id=session_id,
        variant_id=variant_id,
        final_config=final_config,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


async def regenerate_project_image(
    db: AsyncSession,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    prompt: str,
) -> str | None:
    """Generate image baru via AI, upload ke R2 permanent, update final_config project.

    Dipanggil dari editor saat user klik 'Generate Ulang'. Return R2 URL atau None jika gagal.
    """
    from sqlalchemy import select as _select
    from app.models.project import Project as ProjectModel

    raw_url = await ai_service.generate_single_image(prompt)
    if not raw_url:
        return None

    # Download dari provider URL lalu upload ke R2 permanent
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

    # Update final_config di DB
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
    """Download image dari URL eksternal dan upload langsung ke R2 permanent.
    Dipakai sebagai fallback di select_variant jika _persist_image sebelumnya gagal.
    """
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

    campaign = session.campaign_data or {}
    image_source = campaign.get("image_source", "none")
    language_preference = campaign.get("language_preference") or profile.language_preference

    copy_input = CopyInput(
        business_name=profile.business_name,
        industry=profile.industry,
        brand_colors=profile.brand_colors,
        language_style=session.language_style,
        language_preference=language_preference,
        template_theme=template.theme,
        content_brief=campaign.get("content_brief"),
        target_audience=campaign.get("target_audience"),
        campaign_data=campaign,
    )
    image_prompt = campaign.get("image_prompt") or template.theme
    image_input = ImageInput(theme=image_prompt) if image_source == "suggestion" else None

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
