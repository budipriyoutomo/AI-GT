import uuid

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.generate import (
    CreateSessionRequest,
    SelectVariantRequest,
    SessionData,
    VariantData,
)
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
