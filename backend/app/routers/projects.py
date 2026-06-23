import uuid

from fastapi import APIRouter, Depends, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.project import ProjectData, UpdateProjectRequest
from app.services import project_service
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])


@router.get("")
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    projects = await project_service.list_projects(db, current_user.id)
    return {
        "success": True,
        "data": [ProjectData.model_validate(p).model_dump() for p in projects],
    }


@router.get("/{project_id}")
async def get_project(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await project_service.get_project(db, project_id, current_user.id)
    return {"success": True, "data": ProjectData.model_validate(project).model_dump()}


@router.patch("/{project_id}")
async def update_project(
    project_id: uuid.UUID,
    body: UpdateProjectRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await project_service.update_project(db, project_id, current_user.id, body)
    return {"success": True, "data": ProjectData.model_validate(project).model_dump()}


@router.delete("/{project_id}", status_code=200)
async def delete_project(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await project_service.delete_project(db, project_id, current_user.id)
    return {"success": True, "data": None, "message": "Project berhasil dihapus."}


@router.post("/{project_id}/export")
async def export_project(
    project_id: uuid.UUID,
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    file_data = await file.read()
    project = await project_service.export_project(db, project_id, current_user.id, file_data)
    return {"success": True, "data": ProjectData.model_validate(project).model_dump()}
