"""
🔴 RED phase — test generate session endpoint.
"""
import uuid
from unittest.mock import AsyncMock, patch

from httpx import AsyncClient

from app.models import CompanyProfile, Template, User
from app.models.generate_session import GenerateSession
from app.models.generate_variant import GenerateVariant


class TestCreateSession:
    async def test_create_session_success(
        self,
        client: AsyncClient,
        auth_headers: dict,
        sample_template: Template,
        company_profile: CompanyProfile,
    ):
        with patch("app.services.generate_service.run_generation_task", new_callable=AsyncMock):
            res = await client.post("/api/v1/generate/session", headers=auth_headers, json={
                "template_id": str(sample_template.id),
                "language_style": "casual",
                "thematic_image_theme": "seasonal_lebaran",
                "campaign_data": {"goal": "increase sales"},
            })

        assert res.status_code == 201
        body = res.json()
        assert body["success"] is True
        assert "session_id" in body["data"]
        assert body["data"]["status"] == "processing"

    async def test_create_session_no_company_profile(
        self,
        client: AsyncClient,
        auth_headers: dict,
        sample_template: Template,
    ):
        with patch("app.services.generate_service.run_generation_task", new_callable=AsyncMock):
            res = await client.post("/api/v1/generate/session", headers=auth_headers, json={
                "template_id": str(sample_template.id),
                "language_style": "casual",
            })

        assert res.status_code == 404
        assert res.json()["error"]["code"] == "PROFILE_NOT_FOUND"

    async def test_create_session_invalid_template(
        self,
        client: AsyncClient,
        auth_headers: dict,
        company_profile: CompanyProfile,
    ):
        with patch("app.services.generate_service.run_generation_task", new_callable=AsyncMock):
            res = await client.post("/api/v1/generate/session", headers=auth_headers, json={
                "template_id": str(uuid.uuid4()),
                "language_style": "casual",
            })

        assert res.status_code == 404
        assert res.json()["error"]["code"] == "TEMPLATE_NOT_FOUND"

    async def test_create_session_no_auth(self, client: AsyncClient, sample_template: Template):
        res = await client.post("/api/v1/generate/session", json={
            "template_id": str(sample_template.id),
            "language_style": "casual",
        })
        assert res.status_code == 401


class TestGetSession:
    async def test_get_session_completed_with_variants(
        self,
        client: AsyncClient,
        auth_headers: dict,
        completed_session: tuple[GenerateSession, list[GenerateVariant]],
    ):
        session, variants = completed_session
        res = await client.get(f"/api/v1/generate/session/{session.id}", headers=auth_headers)
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        assert body["data"]["status"] == "completed"
        assert len(body["data"]["variants"]) == 3
        assert body["data"]["variants"][0]["copy_data"]["headline"] == "Judul 1"

    async def test_get_session_expired(
        self,
        client: AsyncClient,
        auth_headers: dict,
        expired_session: GenerateSession,
    ):
        res = await client.get(f"/api/v1/generate/session/{expired_session.id}", headers=auth_headers)
        assert res.status_code == 422
        assert res.json()["error"]["code"] == "SESSION_EXPIRED"

    async def test_get_session_not_found(self, client: AsyncClient, auth_headers: dict):
        res = await client.get(f"/api/v1/generate/session/{uuid.uuid4()}", headers=auth_headers)
        assert res.status_code == 404
        assert res.json()["error"]["code"] == "SESSION_NOT_FOUND"

    async def test_get_session_forbidden(
        self,
        client: AsyncClient,
        other_auth_headers: dict,
        completed_session: tuple[GenerateSession, list[GenerateVariant]],
    ):
        session, _ = completed_session
        res = await client.get(f"/api/v1/generate/session/{session.id}", headers=other_auth_headers)
        assert res.status_code == 403

    async def test_get_session_no_auth(
        self,
        client: AsyncClient,
        completed_session: tuple[GenerateSession, list[GenerateVariant]],
    ):
        session, _ = completed_session
        res = await client.get(f"/api/v1/generate/session/{session.id}")
        assert res.status_code == 401


class TestSelectVariant:
    async def test_select_variant_success(
        self,
        client: AsyncClient,
        auth_headers: dict,
        completed_session: tuple[GenerateSession, list[GenerateVariant]],
    ):
        session, variants = completed_session
        res = await client.post(
            f"/api/v1/generate/session/{session.id}/select",
            headers=auth_headers,
            json={"variant_id": str(variants[0].id)},
        )
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        assert "project_id" in body["data"]

    async def test_select_variant_session_expired(
        self,
        client: AsyncClient,
        auth_headers: dict,
        expired_session: GenerateSession,
    ):
        res = await client.post(
            f"/api/v1/generate/session/{expired_session.id}/select",
            headers=auth_headers,
            json={"variant_id": str(uuid.uuid4())},
        )
        assert res.status_code == 422
        assert res.json()["error"]["code"] == "SESSION_EXPIRED"

    async def test_select_variant_not_found(
        self,
        client: AsyncClient,
        auth_headers: dict,
        completed_session: tuple[GenerateSession, list[GenerateVariant]],
    ):
        session, _ = completed_session
        res = await client.post(
            f"/api/v1/generate/session/{session.id}/select",
            headers=auth_headers,
            json={"variant_id": str(uuid.uuid4())},
        )
        assert res.status_code == 404
        assert res.json()["error"]["code"] == "VARIANT_NOT_SELECTED"

    async def test_select_variant_forbidden(
        self,
        client: AsyncClient,
        other_auth_headers: dict,
        completed_session: tuple[GenerateSession, list[GenerateVariant]],
    ):
        session, variants = completed_session
        res = await client.post(
            f"/api/v1/generate/session/{session.id}/select",
            headers=other_auth_headers,
            json={"variant_id": str(variants[0].id)},
        )
        assert res.status_code == 403

    async def test_select_variant_no_auth(
        self,
        client: AsyncClient,
        completed_session: tuple[GenerateSession, list[GenerateVariant]],
    ):
        session, variants = completed_session
        res = await client.post(
            f"/api/v1/generate/session/{session.id}/select",
            json={"variant_id": str(variants[0].id)},
        )
        assert res.status_code == 401


class TestRunGenerationTask:
    """Unit test untuk background task langsung, tanpa endpoint."""

    async def test_run_generation_task_success(
        self,
        db,
        verified_user: User,
        sample_template: Template,
        company_profile: CompanyProfile,
    ):
        from datetime import datetime, timedelta, timezone

        from app.models.generate_session import GenerateSession
        from app.services import ai_service, generate_service
        from app.services.providers.ai_types import CopyResult, CopyVariant, ImageResult

        session = GenerateSession(
            id=uuid.uuid4(),
            user_id=verified_user.id,
            template_id=sample_template.id,
            language_style="casual",
            status="processing",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
        db.add(session)
        await db.commit()

        mock_copy = CopyResult(variants=[
            CopyVariant(i, {"headline": f"H{i}", "body": "B", "cta": "C"}, {"headline_font": "Montserrat", "body_font": "Lato", "headline_size": 36, "body_size": 16, "letter_spacing": 0.5})
            for i in range(1, 4)
        ])
        mock_image = ImageResult(image_urls=["https://img1.png", "https://img2.png", "https://img3.png"])

        with patch.object(ai_service, "generate_content", new=AsyncMock(return_value=(mock_copy, mock_image))):
            await generate_service._do_generate(db, session.id)

        await db.refresh(session)
        assert session.status == "completed"

        from sqlalchemy import select
        variants = (await db.execute(
            select(GenerateVariant).where(GenerateVariant.session_id == session.id)
        )).scalars().all()
        assert len(variants) == 3

    async def test_run_generation_task_copy_failure(
        self,
        db,
        verified_user: User,
        sample_template: Template,
        company_profile: CompanyProfile,
    ):
        from datetime import datetime, timedelta, timezone

        from app.models.generate_session import GenerateSession
        from app.services import ai_service, generate_service
        from app.services.providers.ai_types import CopyError

        session = GenerateSession(
            id=uuid.uuid4(),
            user_id=verified_user.id,
            template_id=sample_template.id,
            language_style="casual",
            status="processing",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
        db.add(session)
        await db.commit()

        with patch.object(ai_service, "generate_content", new=AsyncMock(side_effect=CopyError("Haiku down"))):
            await generate_service._do_generate(db, session.id)

        await db.refresh(session)
        assert session.status == "failed"
