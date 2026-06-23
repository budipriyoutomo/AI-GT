from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.company_profile import (
    CompanyProfileCreate,
    CompanyProfileData,
    CompanyProfileUpdate,
)
from app.services import company_profile_service
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/v1/company-profile", tags=["company-profile"])


@router.get("")
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = await company_profile_service.get_profile(db, current_user.id)
    return {"success": True, "data": CompanyProfileData.model_validate(profile).model_dump()}


@router.post("", status_code=201)
async def create_profile(
    body: CompanyProfileCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = await company_profile_service.create_profile(db, current_user.id, body)
    return {"success": True, "data": CompanyProfileData.model_validate(profile).model_dump()}


@router.patch("")
async def update_profile(
    body: CompanyProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = await company_profile_service.update_profile(db, current_user.id, body)
    return {"success": True, "data": CompanyProfileData.model_validate(profile).model_dump()}
