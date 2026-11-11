"""
Tests untuk generate session endpoint — Quick Generate flow (4 step).
"""
import uuid
from unittest.mock import AsyncMock, patch

from httpx import AsyncClient

from app.models import CompanyProfile, Template, User
from app.models.generate_session import GenerateSession
from app.models.generate_variant import GenerateVariant


# Payload valid untuk Quick Generate
_VALID_PAYLOAD = {
    "template_id": None,  # diisi per test
    "goal": "promo",
    "platform": "instagram_feed",
    "language_style": "casual",
    "product_or_service": "Nasi Goreng Spesial",
    "key_message": "Makan enak harga terjangkau",
    "image_source": "none",
}


def _payload(template_id: str, **overrides) -> dict:
    return {**_VALID_PAYLOAD, "template_id": template_id, **overrides}


class TestCreateSession:
    async def test_create_session_success(
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
                json=_payload(str(sample_template.id)),
            )

        assert res.status_code == 201
        body = res.json()
        assert body["success"] is True
        assert "id" in body["data"]
        assert body["data"]["status"] == "processing"

    async def test_create_session_no_company_profile(
        self,
        client: AsyncClient,
        auth_headers: dict,
        sample_template: Template,
    ):
        with patch("app.services.generate_service.run_generation_task", new_callable=AsyncMock):
            res = await client.post(
                "/api/v1/generate/session",
                headers=auth_headers,
                json=_payload(str(sample_template.id)),
            )

        assert res.status_code == 404
        assert res.json()["error"]["code"] == "PROFILE_NOT_FOUND"

    async def test_create_session_invalid_template(
        self,
        client: AsyncClient,
        auth_headers: dict,
        company_profile: CompanyProfile,
    ):
        with patch("app.services.generate_service.run_generation_task", new_callable=AsyncMock):
            res = await client.post(
                "/api/v1/generate/session",
                headers=auth_headers,
                json=_payload(str(uuid.uuid4())),
            )

        assert res.status_code == 404
        assert res.json()["error"]["code"] == "TEMPLATE_NOT_FOUND"

    async def test_create_session_no_auth(self, client: AsyncClient, sample_template: Template):
        res = await client.post(
            "/api/v1/generate/session",
            json=_payload(str(sample_template.id)),
        )
        assert res.status_code == 401

    async def test_create_session_campaign_data_blocked_for_free_user(
        self,
        client: AsyncClient,
        auth_headers: dict,
        sample_template: Template,
        company_profile: CompanyProfile,
    ):
        """campaign_data non-null = Campaign premium → 403 untuk free user."""
        with patch("app.services.generate_service.run_generation_task", new_callable=AsyncMock):
            res = await client.post(
                "/api/v1/generate/session",
                headers=auth_headers,
                json=_payload(str(sample_template.id), campaign_data={"goal": "awareness"}),
            )

        assert res.status_code == 403
        assert res.json()["error"]["code"] == "FEATURE_REQUIRES_PREMIUM"

    async def test_create_session_generated_without_theme_returns_400(
        self,
        client: AsyncClient,
        auth_headers: dict,
        sample_template: Template,
        company_profile: CompanyProfile,
    ):
        """image_source=generated tanpa thematic_image_theme → 400."""
        with patch("app.services.generate_service.run_generation_task", new_callable=AsyncMock):
            res = await client.post(
                "/api/v1/generate/session",
                headers=auth_headers,
                json=_payload(
                    str(sample_template.id),
                    image_source="generated",
                    thematic_image_theme=None,
                ),
            )

        assert res.status_code == 400

    async def test_create_session_invalid_language_style_returns_422(
        self,
        client: AsyncClient,
        auth_headers: dict,
        sample_template: Template,
        company_profile: CompanyProfile,
    ):
        """language_style di luar enum kanonik → 422 (Pydantic validation)."""
        with patch("app.services.generate_service.run_generation_task", new_callable=AsyncMock):
            res = await client.post(
                "/api/v1/generate/session",
                headers=auth_headers,
                json=_payload(str(sample_template.id), language_style="anak_muda"),
            )

        assert res.status_code == 422

    async def test_create_session_invalid_goal_returns_422(
        self,
        client: AsyncClient,
        auth_headers: dict,
        sample_template: Template,
        company_profile: CompanyProfile,
    ):
        """goal di luar enum → 422."""
        with patch("app.services.generate_service.run_generation_task", new_callable=AsyncMock):
            res = await client.post(
                "/api/v1/generate/session",
                headers=auth_headers,
                json=_payload(str(sample_template.id), goal="increase_sales"),
            )

        assert res.status_code == 422


class TestGetSession:
    async def test_get_session_completed_with_1_variant(
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
        assert len(body["data"]["variants"]) == 1
        assert body["data"]["variants"][0]["copy_data"]["headline"] == "Judul 1"
        assert body["data"]["goal"] == "promo"
        assert body["data"]["platform"] == "instagram_feed"

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
        assert "id" in body["data"]
        assert "final_config" in body["data"]

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

    async def test_run_generation_task_success_1_variant(
        self,
        db,
        verified_user: User,
        sample_template: Template,
        company_profile: CompanyProfile,
    ):
        from datetime import datetime, timedelta, timezone

        from app.models.generate_session import GenerateSession
        from app.models.generate_variant import GenerateVariant
        from app.models.project import Project
        from app.services import ai_service, generate_service
        from app.services.providers.ai_types import CopyResult, CopyVariant, ImageResult
        from sqlalchemy import select

        session = GenerateSession(
            id=uuid.uuid4(),
            user_id=verified_user.id,
            template_id=sample_template.id,
            language_style="casual",
            goal="promo",
            platform="instagram_feed",
            content_data={
                "product_or_service": "Nasi Goreng",
                "key_message": "Enak dan murah",
                "image_source": "none",
            },
            status="processing",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
        db.add(session)
        await db.commit()

        mock_copy = CopyResult(variants=[
            CopyVariant(1, {"headline": "H1", "body": "B", "cta": "C"}, {"headline_font": "Montserrat", "body_font": "Lato", "headline_size": 36, "body_size": 16, "letter_spacing": 0.5})
        ])
        mock_image = ImageResult(image_urls=[None])

        with patch.object(ai_service, "generate_content", new=AsyncMock(return_value=(mock_copy, mock_image))):
            await generate_service._do_generate(db, session.id)

        await db.refresh(session)
        assert session.status == "completed"

        variants = (await db.execute(
            select(GenerateVariant).where(GenerateVariant.session_id == session.id)
        )).scalars().all()
        assert len(variants) == 1

        # Auto-select harus membuat project record
        projects = (await db.execute(
            select(Project).where(Project.session_id == session.id)
        )).scalars().all()
        assert len(projects) == 1
        assert projects[0].user_id == verified_user.id

    async def test_run_generation_task_reports_progress(
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
            goal="promo",
            platform="instagram_feed",
            content_data={
                "product_or_service": "Nasi Goreng",
                "key_message": "Enak dan murah",
                "image_source": "none",
            },
            status="processing",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
        db.add(session)
        await db.commit()

        assert session.progress == 0

        mock_copy = CopyResult(variants=[
            CopyVariant(1, {"headline": "H1", "body": "B", "cta": "C"}, {"headline_font": "Montserrat", "body_font": "Lato", "headline_size": 36, "body_size": 16, "letter_spacing": 0.5})
        ])
        mock_image = ImageResult(image_urls=[None])

        captured = {}

        async def fake_generate(*args, **kwargs):
            # Sebelum AI call selesai, progress harus sudah > 0 dan < 100
            captured["mid"] = session.progress
            return (mock_copy, mock_image)

        with patch.object(ai_service, "generate_content", new=fake_generate):
            await generate_service._do_generate(db, session.id)

        await db.refresh(session)
        assert 0 < captured["mid"] < 100
        assert session.progress == 100

    async def test_get_session_response_includes_progress(
        self,
        client: AsyncClient,
        auth_headers: dict,
        completed_session: "tuple[GenerateSession, list]",
    ):
        session, _ = completed_session
        res = await client.get(
            f"/api/v1/generate/session/{session.id}", headers=auth_headers
        )
        assert res.status_code == 200
        assert "progress" in res.json()["data"]

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
            goal="promo",
            platform="instagram_feed",
            content_data={
                "product_or_service": "Nasi Goreng",
                "key_message": "Enak dan murah",
                "image_source": "none",
            },
            status="processing",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
        db.add(session)
        await db.commit()

        with patch.object(ai_service, "generate_content", new=AsyncMock(side_effect=CopyError("Haiku down"))):
            await generate_service._do_generate(db, session.id)

        await db.refresh(session)
        assert session.status == "failed"

    async def test_run_generation_task_auto_select_creates_project(
        self,
        db,
        verified_user: User,
        sample_template: Template,
        company_profile: CompanyProfile,
    ):
        """Setelah generate selesai, project harus auto-dibuat dengan project_id tersedia."""
        from datetime import datetime, timedelta, timezone

        from app.models.generate_session import GenerateSession
        from app.models.project import Project
        from app.services import ai_service, generate_service
        from app.services.providers.ai_types import CopyResult, CopyVariant, ImageResult
        from sqlalchemy import select

        session = GenerateSession(
            id=uuid.uuid4(),
            user_id=verified_user.id,
            template_id=sample_template.id,
            language_style="casual",
            goal="engagement",
            platform="tiktok",
            content_data={
                "product_or_service": "Boba Susu",
                "key_message": "Minuman viral",
                "image_source": "none",
            },
            status="processing",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
        db.add(session)
        await db.commit()

        mock_copy = CopyResult(variants=[
            CopyVariant(1, {"headline": "Boba viral!", "body": "Coba sekarang", "cta": "Order"}, {"headline_font": "Poppins", "body_font": "Inter", "headline_size": 36, "body_size": 16, "letter_spacing": 0.5})
        ])
        mock_image = ImageResult(image_urls=[None])

        with patch.object(ai_service, "generate_content", new=AsyncMock(return_value=(mock_copy, mock_image))):
            await generate_service._do_generate(db, session.id)

        projects = (await db.execute(
            select(Project).where(Project.session_id == session.id)
        )).scalars().all()
        assert len(projects) == 1
        assert projects[0].final_config["copy"]["headline"] == "Boba viral!"


class TestBrandApplied:
    """Handoff 8a §3.4 — final_config.brand_applied: bool. Hanya boolean, tidak ada
    brand data (warna/font/logo) yang disnapshot. template_config di DB tetap read-only."""

    async def test_create_session_persists_brand_applied(
        self,
        db,
        client: AsyncClient,
        auth_headers: dict,
        sample_template: Template,
        company_profile: CompanyProfile,
    ):
        from sqlalchemy import select

        from app.models.generate_session import GenerateSession

        with patch("app.services.generate_service.run_generation_task", new_callable=AsyncMock):
            res = await client.post(
                "/api/v1/generate/session",
                headers=auth_headers,
                json=_payload(str(sample_template.id), brand_applied=True),
            )
        assert res.status_code == 201

        session = await db.scalar(
            select(GenerateSession).where(GenerateSession.id == uuid.UUID(res.json()["data"]["id"]))
        )
        assert session.content_data["brand_applied"] is True

    async def test_create_session_brand_applied_not_sent_defaults_false(
        self,
        db,
        client: AsyncClient,
        auth_headers: dict,
        sample_template: Template,
        company_profile: CompanyProfile,
    ):
        from sqlalchemy import select

        from app.models.generate_session import GenerateSession

        with patch("app.services.generate_service.run_generation_task", new_callable=AsyncMock):
            res = await client.post(
                "/api/v1/generate/session",
                headers=auth_headers,
                json=_payload(str(sample_template.id)),
            )
        assert res.status_code == 201

        session = await db.scalar(
            select(GenerateSession).where(GenerateSession.id == uuid.UUID(res.json()["data"]["id"]))
        )
        assert session.content_data["brand_applied"] is False

    async def test_select_variant_writes_brand_applied_to_final_config(
        self,
        db,
        client: AsyncClient,
        auth_headers: dict,
        verified_user: User,
        sample_template: Template,
        company_profile: CompanyProfile,
    ):
        """Campaign flow (select_variant) — brand_applied ikut ke final_config top-level,
        template_config di DB (sample_template.template_config) tidak berubah."""
        from datetime import datetime, timedelta, timezone

        from app.models.generate_session import GenerateSession
        from app.models.generate_variant import GenerateVariant

        original_template_config = dict(sample_template.template_config)

        session = GenerateSession(
            id=uuid.uuid4(),
            user_id=verified_user.id,
            template_id=sample_template.id,
            language_style="casual",
            goal="promo",
            platform="instagram_feed",
            content_data={
                "product_or_service": "Nasi Goreng",
                "key_message": "Enak dan murah",
                "image_source": "none",
                "brand_applied": True,
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
            copy_data={"headline": "Judul", "body": "Body", "cta": "CTA"},
            typography_data={"headline_font": "Inter", "body_font": "Inter", "headline_size": 36, "body_size": 16, "letter_spacing": 0},
            thematic_image_url=None,
        )
        db.add(variant)
        await db.commit()

        res = await client.post(
            f"/api/v1/generate/session/{session.id}/select",
            headers=auth_headers,
            json={"variant_id": str(variant.id)},
        )
        assert res.status_code == 200
        assert res.json()["data"]["final_config"]["brand_applied"] is True

        await db.refresh(sample_template)
        assert sample_template.template_config == original_template_config

    async def test_auto_select_first_variant_writes_brand_applied(
        self,
        db,
        verified_user: User,
        sample_template: Template,
        company_profile: CompanyProfile,
    ):
        """Quick Generate (auto-select) — brand_applied ikut tertulis ke final_config."""
        from datetime import datetime, timedelta, timezone

        from app.models.generate_session import GenerateSession
        from app.models.project import Project
        from app.services import ai_service, generate_service
        from app.services.providers.ai_types import CopyResult, CopyVariant, ImageResult
        from sqlalchemy import select

        session = GenerateSession(
            id=uuid.uuid4(),
            user_id=verified_user.id,
            template_id=sample_template.id,
            language_style="casual",
            goal="promo",
            platform="instagram_feed",
            content_data={
                "product_or_service": "Es Teh",
                "key_message": "Segar",
                "image_source": "none",
                "brand_applied": True,
            },
            status="processing",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
        db.add(session)
        await db.commit()

        mock_copy = CopyResult(variants=[
            CopyVariant(1, {"headline": "H", "body": "B", "cta": "C"}, {"headline_font": "Inter", "body_font": "Inter", "headline_size": 36, "body_size": 16, "letter_spacing": 0.5})
        ])
        mock_image = ImageResult(image_urls=[None])

        with patch.object(ai_service, "generate_content", new=AsyncMock(return_value=(mock_copy, mock_image))):
            await generate_service._do_generate(db, session.id)

        project = await db.scalar(select(Project).where(Project.session_id == session.id))
        assert project is not None
        assert project.final_config["brand_applied"] is True


class TestPlatformLockedToInstagramFeed:
    """P1-4c — MVP dikunci ke Instagram Feed (semua template 4:5 `instagram_post`).

    Platform lain dulu bisa dipilih tapi tak mengubah apa pun selain prompt — copy ditulis
    untuk TikTok/Story sementara output tetap poster 4:5 Instagram.
    """

    async def test_platform_optional_defaults_to_instagram_feed(
        self, client: AsyncClient, auth_headers: dict, sample_template: Template, company_profile: CompanyProfile,
    ):
        payload = _payload(str(sample_template.id))
        payload.pop("platform")
        with patch("app.services.generate_service.run_generation_task", new_callable=AsyncMock):
            res = await client.post("/api/v1/generate/session", headers=auth_headers, json=payload)
        assert res.status_code == 201
        session_id = res.json()["data"]["id"]
        session = await client.get(f"/api/v1/generate/session/{session_id}", headers=auth_headers)
        assert session.json()["data"]["platform"] == "instagram_feed"

    async def test_other_platforms_rejected(
        self, client: AsyncClient, auth_headers: dict, sample_template: Template, company_profile: CompanyProfile,
    ):
        for platform in ("instagram_story", "facebook", "tiktok"):
            with patch("app.services.generate_service.run_generation_task", new_callable=AsyncMock):
                res = await client.post(
                    "/api/v1/generate/session", headers=auth_headers,
                    json=_payload(str(sample_template.id), platform=platform),
                )
            assert res.status_code == 422, platform


class TestGenerateAuxEndpoints:
    """P3-2 — endpoint pendukung di routers/generate.py yang belum teruji."""

    async def test_upload_image(self, client: AsyncClient, auth_headers: dict, verified_user: User):
        from app.services import storage_service

        url = f"/permanent/uploads/{verified_user.id}/abc.png"
        with patch.object(storage_service, "upload_content_image", return_value=url) as up:
            res = await client.post(
                "/api/v1/generate/upload-image", headers=auth_headers,
                files={"file": ("a.png", b"PNGDATA", "image/png")},
            )
        assert res.status_code == 200
        assert res.json() == {"success": True, "data": {"image_url": url}}
        up.assert_called_once_with(str(verified_user.id), b"PNGDATA")

    async def test_upload_image_requires_auth(self, client: AsyncClient):
        res = await client.post("/api/v1/generate/upload-image", files={"file": ("a.png", b"x", "image/png")})
        assert res.status_code == 401

    async def test_image_suggestions(self, client: AsyncClient, auth_headers: dict):
        from app.services import ai_service

        with patch.object(ai_service, "generate_image_suggestions", new=AsyncMock(return_value=["a", "b", "c"])) as gen:
            res = await client.post(
                "/api/v1/generate/image-suggestions", headers=auth_headers,
                json={"content_brief": "kopi susu", "industry": "fnb"},
            )
        assert res.status_code == 200
        assert res.json()["data"]["suggestions"] == ["a", "b", "c"]
        assert gen.call_args.kwargs["language_preference"] == "id"  # default

    async def test_image_suggestions_ai_failure_is_503(self, client: AsyncClient, auth_headers: dict):
        """AGENTS.md §4: provider AI tidak tersedia → 503 AI_GENERATION_FAILED."""
        from app.services import ai_service

        with patch.object(ai_service, "generate_image_suggestions", new=AsyncMock(return_value=[])):
            res = await client.post(
                "/api/v1/generate/image-suggestions", headers=auth_headers, json={"content_brief": "kopi"},
            )
        assert res.status_code == 503
        assert res.json()["error"]["code"] == "AI_GENERATION_FAILED"

    async def test_image_suggestions_validation(self, client: AsyncClient, auth_headers: dict):
        res = await client.post("/api/v1/generate/image-suggestions", headers=auth_headers, json={})
        assert res.status_code == 422

    async def test_image_without_project(self, client: AsyncClient, auth_headers: dict):
        from app.services import ai_service

        with patch.object(ai_service, "generate_single_image", new=AsyncMock(return_value="https://img/x.png")):
            res = await client.post("/api/v1/generate/image", headers=auth_headers, json={"prompt": "kopi"})
        assert res.status_code == 200
        assert res.json()["data"]["url"] == "https://img/x.png"

    async def test_image_for_project(self, client: AsyncClient, auth_headers: dict, verified_user: User, project):
        from app.services import generate_service

        with patch.object(generate_service, "regenerate_project_image", new=AsyncMock(return_value="/permanent/x.png")) as regen:
            res = await client.post(
                "/api/v1/generate/image", headers=auth_headers,
                json={"prompt": "kopi", "project_id": str(project.id)},
            )
        assert res.json()["data"]["url"] == "/permanent/x.png"
        args = regen.call_args.args
        assert (args[1], args[2], args[3]) == (verified_user.id, project.id, "kopi")

    async def test_image_ai_failure_returns_null_url(self, client: AsyncClient, auth_headers: dict):
        """Kegagalan gambar tidak menggagalkan request (AGENTS.md §5) — url null."""
        from app.services import ai_service

        with patch.object(ai_service, "generate_single_image", new=AsyncMock(return_value=None)):
            res = await client.post("/api/v1/generate/image", headers=auth_headers, json={"prompt": "kopi"})
        assert res.status_code == 200
        assert res.json()["data"]["url"] is None
