import os
import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("AUTH_PROVIDER", "jwt")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing-only-32chars")
os.environ.setdefault("ANTHROPIC_API_KEY", "test")
os.environ.setdefault("REPLICATE_API_TOKEN", "test")

from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import CompanyProfile, Template, User  # noqa: E402
from app.services.auth_service import get_auth_provider  # noqa: E402

TEST_ENGINE = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
TestSession = async_sessionmaker(TEST_ENGINE, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_db():
    async with TEST_ENGINE.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with TEST_ENGINE.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db() -> AsyncSession:
    async with TestSession() as session:
        yield session


@pytest_asyncio.fixture
async def client(db: AsyncSession) -> AsyncClient:
    app.dependency_overrides[get_db] = lambda: db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def verified_user(db: AsyncSession) -> User:
    """User sudah verified — siap login."""
    provider = get_auth_provider()
    user = User(
        id=uuid.uuid4(),
        email="test@example.com",
        password_hash=provider.hash_password("password123"),
        name="Test User",
        is_verified=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def unverified_user(db: AsyncSession) -> User:
    """User belum verified — login harus gagal."""
    provider = get_auth_provider()
    user = User(
        id=uuid.uuid4(),
        email="unverified@example.com",
        password_hash=provider.hash_password("password123"),
        name="Unverified User",
        is_verified=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def auth_headers(verified_user: User) -> dict:
    """Header Authorization untuk request yang butuh auth."""
    provider = get_auth_provider()
    token = provider.create_token(str(verified_user.id))
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def other_user(db: AsyncSession) -> User:
    """User lain — untuk test forbidden access."""
    provider = get_auth_provider()
    user = User(
        id=uuid.uuid4(),
        email="other@example.com",
        password_hash=provider.hash_password("password123"),
        name="Other User",
        is_verified=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def other_auth_headers(other_user: User) -> dict:
    provider = get_auth_provider()
    token = provider.create_token(str(other_user.id))
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def company_profile(db: AsyncSession, verified_user: User) -> CompanyProfile:
    """Company profile untuk verified_user."""
    profile = CompanyProfile(
        id=uuid.uuid4(),
        user_id=verified_user.id,
        business_name="Toko Budi",
        industry="fnb",
        language_preference="id",
        brand_colors=["#FF5733", "#FFC300"],
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile


@pytest_asyncio.fixture
async def sample_template(db: AsyncSession) -> Template:
    """Template aktif untuk digunakan di berbagai test."""
    template = Template(
        id=uuid.uuid4(),
        name="Template Lebaran FnB",
        industry="fnb",
        theme="seasonal_lebaran",
        content_type="single",
        thumbnail_url="https://r2.example.com/templates/thumbnails/tmpl-1.png",
        template_config={"layout": "grid", "background": "#FFFFFF"},
        is_premium=False,
        is_active=True,
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template
