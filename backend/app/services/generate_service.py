"""
Generate service — orchestrasi session, AI call (background), dan pilih varian.
"""
import logging
import uuid
from datetime import datetime, timedelta, timezone

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
        thematic_image_theme=data.thematic_image_theme,
        campaign_data=data.campaign_data,
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

    # Move thematic image from temp/ to permanent/ before creating the project.
    # If the move fails (e.g. R2 not configured in dev), fall back to the temp URL
    # so the session is not blocked — the image may expire after 1h in that case.
    thematic_url = variant.thematic_image_url
    if thematic_url:
        try:
            temp_key = urlparse(thematic_url).path.lstrip("/")
            if temp_key.startswith("temp/"):
                thematic_url = storage_service.move_to_permanent(
                    temp_key, str(user_id), str(project_id)
                )
        except AppError:
            logger.warning(
                "select_variant: failed to move thematic image to permanent, keeping temp URL. "
                "session_id=%s variant_id=%s",
                session_id,
                variant_id,
            )

    final_config: dict = {
        "copy": variant.copy_data,
        "typography": variant.typography_data,
        "thematic_image_url": thematic_url,
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

    copy_input = CopyInput(
        business_name=profile.business_name,
        industry=profile.industry,
        brand_colors=profile.brand_colors,
        language_style=session.language_style,
        language_preference=profile.language_preference,
        campaign_data=session.campaign_data,
        template_theme=template.theme,
    )
    image_input = (
        ImageInput(theme=session.thematic_image_theme)
        if session.thematic_image_theme
        else None
    )

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
        image_url = image_result.image_urls[idx] if idx < len(image_result.image_urls) else None
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
