from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.contact import ContactMessageCreate, ContactMessageData
from app.services import contact_service

router = APIRouter(prefix="/api/v1/contact", tags=["contact"])


@router.post("", status_code=201)
async def create_contact_message(
    body: ContactMessageCreate,
    db: AsyncSession = Depends(get_db),
):
    msg = await contact_service.create_message(db, body)
    return {
        "success": True,
        "data": ContactMessageData.model_validate(msg).model_dump(),
        "message": "Pesan kamu terkirim. Tim kami akan membalas lewat email.",
    }
