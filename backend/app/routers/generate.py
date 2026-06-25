import uuid

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.generate import (
    CreateSessionRequest,
    GenerateImageRequest,
    ImageSuggestionsRequest,
    SelectVariantRequest,
    SessionData,
    VariantData,
)
from app.utils.exceptions import AppError, ErrorCode
from app.schemas.project import ProjectData
from app.services import generate_service
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/v1/generate", tags=["generate"])


@router.post("/session", status_code=201)
async def create_session(
    body: CreateSessionRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await generate_service.create_session(db, current_user.id, body)
    background_tasks.add_task(generate_service.run_generation_task, session.id)
    return {
        "success": True,
        "data": {"id": str(session.id), "status": session.status},
    }


@router.get("/session/{session_id}")
async def get_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await generate_service.get_session(db, session_id, current_user.id)
    data = SessionData.model_validate(session)
    return {"success": True, "data": data.model_dump()}


@router.post("/image-suggestions")
async def get_image_suggestions(
    body: ImageSuggestionsRequest,
    current_user: User = Depends(get_current_user),
):
    from app.services import ai_service as _ai
    suggestions = await _ai.generate_image_suggestions(
        content_brief=body.content_brief,
        template_theme=body.template_theme or "",
        industry=body.industry or "",
        target_audience=body.target_audience or "",
        language_preference=body.language_preference or "id",
    )
    if not suggestions:
        raise AppError(503, ErrorCode.AI_GENERATION_FAILED, "Gagal membuat saran prompt. Coba lagi.")
    return {"success": True, "data": {"suggestions": suggestions}}


@router.post("/image")
async def generate_image(
    body: GenerateImageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.project_id:
        url = await generate_service.regenerate_project_image(
            db, current_user.id, body.project_id, body.prompt
        )
    else:
        from app.services import ai_service as _ai
        url = await _ai.generate_single_image(body.prompt)
    return {"success": True, "data": {"url": url}}


@router.post("/session/{session_id}/select")
async def select_variant(
    session_id: uuid.UUID,
    body: SelectVariantRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await generate_service.select_variant(
        db, current_user.id, session_id, body.variant_id
    )
    return {"success": True, "data": ProjectData.model_validate(project).model_dump()}
