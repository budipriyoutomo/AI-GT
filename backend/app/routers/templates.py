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


def _build_preview_config(tc: dict) -> dict:
    zones = tc.get("zones", {})
    logo_zone = zones.get("logo", {})
    anchors = logo_zone.get("anchors", [])
    default_anchor = anchors[0] if anchors else {}
    logo_pos = default_anchor.get("logo", {"x": 0.04, "y": 0.03, "width": 0.22, "height": 0.08})
    affects = default_anchor.get("affects", {})

    def _zone(key: str) -> dict | None:
        z = zones.get(key)
        if not z:
            return None
        s = z.get("style", {})
        style: dict = {
            "fontSize": s.get("fontSize"),
            "fontWeight": s.get("fontWeight"),
            "color": s.get("color"),
        }
        if "accentWords" in s:
            style["accentWords"] = s.get("accentWords")
            style["accentColor"] = s.get("accentColor")
        return {
            "x": z.get("x", 0),
            "y": affects.get(key, {}).get("y", z.get("y", 0)),
            "width": z.get("width", 0),
            "height": z.get("height", 0),
            "visible": z.get("visible", True),
            "value": z.get("value", ""),
            "style": style,
        }

    footer = zones.get("footer", {})
    fs = footer.get("style", {})

    return {
        "color_scheme": tc.get("color_scheme", {}),
        "font_family": tc.get("font", {}).get("family", "Inter"),
        "zones": {
            "logo": logo_pos,
            "headline": _zone("headline"),
            "body": _zone("body"),
            "cta": _zone("cta"),
            "footer": {
                "x": footer.get("x", 0),
                "y": footer.get("y", 0.88),
                "width": footer.get("width", 1.0),
                "height": footer.get("height", 0.12),
                "slots": footer.get("slots", []),
                "style": {
                    "color": fs.get("color", "primary"),
                    "backgroundColor": fs.get("backgroundColor", "#000000"),
                    "opacity": fs.get("opacity", 0.6),
                    "fontSize": fs.get("fontSize", 20),
                },
            },
        },
    }


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
    data = []
    for row in rows:
        row_dict = dict(row)
        template_config = row_dict.pop("template_config", {})
        row_dict["preview_config"] = _build_preview_config(template_config)
        data.append(TemplateListData.model_validate(row_dict).model_dump())
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
