import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.template import Template
from app.models.user import User
from app.schemas.template import TemplateData
from app.utils.auth import get_current_user
from app.utils.exceptions import AppError, ErrorCode

router = APIRouter(prefix="/api/v1/templates", tags=["templates"])


@router.get("")
async def list_templates(
    industry: str | None = None,
    theme: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Template).where(Template.is_active == True)  # noqa: E712
    if industry:
        query = query.where(Template.industry == industry)
    if theme:
        query = query.where(Template.theme == theme)

    result = await db.execute(query)
    templates = result.scalars().all()
    return {
        "success": True,
        "data": [TemplateData.model_validate(t).model_dump() for t in templates],
    }


@router.get("/{template_id}")
async def get_template(
    template_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    template = await db.scalar(
        select(Template).where(
            Template.id == template_id,
            Template.is_active == True,  # noqa: E712
        )
    )
    if not template:
        raise AppError(404, ErrorCode.TEMPLATE_NOT_FOUND, "Template tidak ditemukan.")

    return {"success": True, "data": TemplateData.model_validate(template).model_dump()}
