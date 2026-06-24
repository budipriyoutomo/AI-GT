from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth as auth_router
from app.routers import company_profile as company_profile_router
from app.routers import generate as generate_router
from app.routers import projects as projects_router
from app.routers import templates as templates_router
from app.services.cleanup_service import cleanup_expired_temp_files
from app.utils.exceptions import AppError, app_error_handler


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = AsyncIOScheduler()
    scheduler.add_job(cleanup_expired_temp_files, "interval", minutes=30)
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(
    title="AI-GT API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppError, app_error_handler)

app.include_router(auth_router.router)
app.include_router(company_profile_router.router)
app.include_router(templates_router.router)
app.include_router(generate_router.router)
app.include_router(projects_router.router)


@app.get("/health")
async def health():
    return {"success": True, "data": {"status": "ok"}}
