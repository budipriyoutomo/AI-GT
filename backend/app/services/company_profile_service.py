import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company_profile import CompanyProfile
from app.schemas.company_profile import CompanyProfileCreate, CompanyProfileUpdate
from app.services import storage_service
from app.utils.exceptions import AppError, ErrorCode


async def get_profile(db: AsyncSession, user_id: uuid.UUID) -> CompanyProfile:
    profile = await db.scalar(
        select(CompanyProfile).where(CompanyProfile.user_id == user_id)
    )
    if not profile:
        raise AppError(404, ErrorCode.PROFILE_NOT_FOUND, "Company profile belum dibuat.")
    return profile


async def create_profile(
    db: AsyncSession, user_id: uuid.UUID, data: CompanyProfileCreate
) -> CompanyProfile:
    existing = await db.scalar(
        select(CompanyProfile).where(CompanyProfile.user_id == user_id)
    )
    if existing:
        raise AppError(400, ErrorCode.PROFILE_NOT_FOUND, "Company profile sudah ada.")

    profile = CompanyProfile(
        id=uuid.uuid4(),
        user_id=user_id,
        business_name=data.business_name,
        industry=data.industry,
        logo_url=data.logo_url,
        brand_colors=data.brand_colors,
        brand_font=data.brand_font,
        tagline=data.tagline,
        contact=data.contact.model_dump() if data.contact else None,
        language_preference=data.language_preference,
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile


async def update_logo(
    db: AsyncSession,
    user_id: uuid.UUID,
    file_data: bytes,
    ext: str,
    content_type: str,
) -> CompanyProfile:
    profile = await get_profile(db, user_id)
    url = storage_service.upload_logo(file_data, str(user_id), ext, content_type)
    profile.logo_url = url
    await db.commit()
    await db.refresh(profile)
    return profile


async def update_profile(
    db: AsyncSession, user_id: uuid.UUID, data: CompanyProfileUpdate
) -> CompanyProfile:
    profile = await get_profile(db, user_id)

    update_data = data.model_dump(exclude_unset=True)
    if "contact" in update_data and update_data["contact"] is not None:
        update_data["contact"] = data.contact.model_dump()

    for field, value in update_data.items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)
    return profile
