import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.schemas.project import UpdateProjectRequest
from app.services import storage_service
from app.utils.exceptions import AppError, ErrorCode


async def _get_owned(db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID) -> Project:
    project = await db.get(Project, project_id)
    if not project:
        raise AppError(404, ErrorCode.SESSION_NOT_FOUND, "Project tidak ditemukan.")
    if project.user_id != user_id:
        raise AppError(403, ErrorCode.SESSION_NOT_FOUND, "Akses ditolak.")
    return project


async def list_projects(db: AsyncSession, user_id: uuid.UUID) -> list[Project]:
    result = await db.execute(
        select(Project)
        .where(Project.user_id == user_id)
        .order_by(Project.created_at.desc())
    )
    return list(result.scalars().all())


async def get_project(db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID) -> Project:
    return await _get_owned(db, project_id, user_id)


async def update_project(
    db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID, data: UpdateProjectRequest
) -> Project:
    project = await _get_owned(db, project_id, user_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    await db.commit()
    await db.refresh(project)
    return project


async def delete_project(db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID) -> None:
    project = await _get_owned(db, project_id, user_id)
    await db.delete(project)
    await db.commit()


async def update_thumbnail(
    db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID, file_data: bytes
) -> Project:
    project = await _get_owned(db, project_id, user_id)
    url = storage_service.upload_thumbnail(file_data, str(user_id), str(project_id))
    project.thumbnail_url = url
    await db.commit()
    await db.refresh(project)
    return project


async def export_project(
    db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID, file_data: bytes
) -> Project:
    project = await _get_owned(db, project_id, user_id)
    url = storage_service.upload_exported(file_data, str(user_id), str(project_id))
    project.exported_image_url = url
    project.thumbnail_url = url  # export juga update thumbnail agar dashboard sinkron
    project.is_exported = True
    await db.commit()
    await db.refresh(project)
    return project
