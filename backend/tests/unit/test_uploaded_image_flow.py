"""image_source = "upload": gambar user ikut dari create session sampai final_config project.

Berbeda dari "generated", tidak ada AI image call — URL-nya sudah ada sejak awal
(hasil POST /generate/upload-image) dan hanya perlu diteruskan.
"""
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import CompanyProfile, Template
from app.models.generate_session import GenerateSession
from app.models.generate_variant import GenerateVariant
from app.models.user import User

def _uploaded_url(user: User) -> str:
    return f"/permanent/uploads/{user.id}/abc123.png"

_VALID_PAYLOAD = {
    "goal": "promo",
    "platform": "instagram_feed",
    "language_style": "casual",
    "product_or_service": "Nasi Goreng Spesial",
    "key_message": "Makan enak harga terjangkau",
}


def _payload(template_id: str, **overrides) -> dict:
    return {**_VALID_PAYLOAD, "template_id": template_id, **overrides}


class TestCreateSessionWithUpload:
    async def test_upload_source_persists_url_in_content_data(
        self,
        client: AsyncClient,
        auth_headers: dict,
        db: AsyncSession,
        verified_user: User,
        sample_template: Template,
        company_profile: CompanyProfile,
    ):
        with patch("app.services.generate_service.run_generation_task", new_callable=AsyncMock):
            res = await client.post(
                "/api/v1/generate/session",
                headers=auth_headers,
                json=_payload(
                    str(sample_template.id),
                    image_source="upload",
                    uploaded_image_url=_uploaded_url(verified_user),
                ),
            )

        assert res.status_code == 201
        session = await db.scalar(
            select(GenerateSession).where(GenerateSession.id == uuid.UUID(res.json()["data"]["id"]))
        )
        assert session.content_data["image_source"] == "upload"
        assert session.content_data["uploaded_image_url"] == _uploaded_url(verified_user)

    async def test_upload_source_without_url_returns_400(
        self,
        client: AsyncClient,
        auth_headers: dict,
        sample_template: Template,
        company_profile: CompanyProfile,
    ):
        with patch("app.services.generate_service.run_generation_task", new_callable=AsyncMock):
            res = await client.post(
                "/api/v1/generate/session",
                headers=auth_headers,
                json=_payload(str(sample_template.id), image_source="upload"),
            )
        assert res.status_code == 400

    async def test_non_upload_source_with_url_returns_400(
        self,
        client: AsyncClient,
        auth_headers: dict,
        verified_user: User,
        sample_template: Template,
        company_profile: CompanyProfile,
    ):
        """uploaded_image_url tanpa image_source="upload" = brief tidak konsisten."""
        with patch("app.services.generate_service.run_generation_task", new_callable=AsyncMock):
            res = await client.post(
                "/api/v1/generate/session",
                headers=auth_headers,
                json=_payload(
                    str(sample_template.id),
                    image_source="none",
                    uploaded_image_url=_uploaded_url(verified_user),
                ),
            )
        assert res.status_code == 400

    async def test_rejects_url_outside_permanent_uploads(
        self,
        client: AsyncClient,
        auth_headers: dict,
        sample_template: Template,
        company_profile: CompanyProfile,
    ):
        """Client tidak boleh menunjuk key R2 sembarangan lewat field ini."""
        with patch("app.services.generate_service.run_generation_task", new_callable=AsyncMock):
            res = await client.post(
                "/api/v1/generate/session",
                headers=auth_headers,
                json=_payload(
                    str(sample_template.id),
                    image_source="upload",
                    uploaded_image_url="https://evil.example.com/x.png",
                ),
            )
        assert res.status_code == 400


@pytest.fixture
def _uploaded_session_factory(db: AsyncSession, verified_user: User, sample_template: Template):
    async def make() -> tuple[GenerateSession, GenerateVariant]:
        session = GenerateSession(
            id=uuid.uuid4(),
            user_id=verified_user.id,
            template_id=sample_template.id,
            language_style="casual",
            goal="promo",
            platform="instagram_feed",
            content_data={
                "product_or_service": "Nasi Goreng Spesial",
                "key_message": "Makan enak harga terjangkau",
                "image_source": "upload",
                "uploaded_image_url": _uploaded_url(verified_user),
            },
            status="completed",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
        db.add(session)
        await db.flush()
        variant = GenerateVariant(
            id=uuid.uuid4(),
            session_id=session.id,
            variant_number=1,
            copy_data={"headline": "Judul", "body": "Body.", "cta": "Pesan"},
            typography_data={
                "headline_font": "Montserrat",
                "body_font": "Lato",
                "headline_size": 36,
                "body_size": 16,
                "letter_spacing": 0.5,
            },
            thematic_image_url=None,  # tidak ada AI image untuk source "upload"
        )
        db.add(variant)
        await db.commit()
        await db.refresh(session)
        await db.refresh(variant)
        return session, variant

    return make


class TestSelectVariantWithUpload:
    async def test_final_config_carries_uploaded_image(
        self,
        client: AsyncClient,
        auth_headers: dict,
        verified_user: User,
        company_profile: CompanyProfile,
        _uploaded_session_factory,
    ):
        session, variant = await _uploaded_session_factory()
        res = await client.post(
            f"/api/v1/generate/session/{session.id}/select",
            headers=auth_headers,
            json={"variant_id": str(variant.id)},
        )
        assert res.status_code == 200
        final_config = res.json()["data"]["final_config"]
        assert final_config["image_source"] == "upload"
        assert final_config["thematic_image_url"] == _uploaded_url(verified_user)


class TestAutoSelectWithUpload:
    """Quick Generate membuat project otomatis lewat _auto_select_first_variant —
    inilah jalur yang dipakai UI (frontend redirect ke session.project_id), bukan
    endpoint /select. Gambar upload harus ikut di sini juga."""

    async def test_auto_created_project_carries_uploaded_image(
        self,
        db: AsyncSession,
        verified_user: User,
        sample_template: Template,
        company_profile: CompanyProfile,
    ):
        from app.models.project import Project
        from app.services import generate_service

        session = GenerateSession(
            id=uuid.uuid4(),
            user_id=verified_user.id,
            template_id=sample_template.id,
            language_style="casual",
            goal="promo",
            platform="instagram_feed",
            content_data={
                "product_or_service": "Kopi Senja",
                "key_message": "Nikmati senja",
                "image_source": "upload",
                "uploaded_image_url": _uploaded_url(verified_user),
            },
            campaign_data=None,
            status="completed",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
        db.add(session)
        await db.flush()
        db.add(GenerateVariant(
            id=uuid.uuid4(),
            session_id=session.id,
            variant_number=1,
            copy_data={"headline": "Judul", "body": "Body.", "cta": "Pesan"},
            typography_data={"headline_font": "Montserrat", "body_font": "Lato",
                             "headline_size": 36, "body_size": 16, "letter_spacing": 0.5},
            thematic_image_url=None,  # tidak ada AI image untuk source "upload"
        ))
        await db.commit()

        await generate_service._auto_select_first_variant(db, session)

        project = await db.scalar(select(Project).where(Project.session_id == session.id))
        assert project is not None
        assert project.final_config["image_source"] == "upload"
        assert project.final_config["thematic_image_url"] == _uploaded_url(verified_user)
