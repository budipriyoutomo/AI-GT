import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.template import Template
from app.models.user import User
from app.schemas.template import TemplateData, TemplateListData
from app.utils.auth import get_current_user
from app.utils.exceptions import AppError, ErrorCode

router = APIRouter(prefix="/api/v1/templates", tags=["templates"])

_LIST_COLUMNS = (
    Template.id,
    Template.name,
    Template.industry,
    Template.theme,
    Template.content_type,
    Template.layout_type,
    Template.thumbnail_url,
    Template.is_premium,
    Template.template_config,
)


@router.get("")
async def list_templates(
    industry: str | None = None,
    theme: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(*_LIST_COLUMNS).where(Template.is_active == True)  # noqa: E712
    if industry:
        query = query.where(Template.industry == industry)
    if theme:
        query = query.where(Template.theme == theme)

    result = await db.execute(query)
    rows = result.mappings().all()
    data = [TemplateListData.model_validate(dict(row)).model_dump() for row in rows]
    return {"success": True, "data": data}


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
