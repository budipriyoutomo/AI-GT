import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contact_message import ContactMessage
from app.schemas.contact import ContactMessageCreate


async def create_message(db: AsyncSession, data: ContactMessageCreate) -> ContactMessage:
    msg = ContactMessage(
        id=uuid.uuid4(),
        name=data.name,
        email=str(data.email).lower(),
        category=data.category,
        message=data.message,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg
