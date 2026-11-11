import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

# App-module loggers (logging.getLogger(__name__)) propagate to root, which
# defaults to WARNING under uvicorn — so logger.info() is silent. Force INFO so
# the AI copy prompt (logged in the copy providers) shows in the server console.
logging.basicConfig(level=logging.INFO)
from app.routers import admin as admin_router
from app.routers import assets as assets_router
from app.routers import auth as auth_router
from app.routers import billing as billing_router
from app.routers import company_profile as company_profile_router
from app.routers import contact as contact_router
from app.routers import generate as generate_router
from app.routers import projects as projects_router
from app.routers import templates as templates_router
from app.services import job_service
from app.utils.exceptions import AppError, app_error_handler


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = AsyncIOScheduler()
    # Lewat job_service supaya setiap run tercatat di job_runs (dipantau di /admin/storage).
    for name, job in job_service.JOBS.items():
        scheduler.add_job(job_service.run_scheduled, "interval", minutes=job["interval_minutes"], args=[name])
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

app.include_router(admin_router.router)
app.include_router(assets_router.router)
app.include_router(auth_router.router)
app.include_router(billing_router.router)
app.include_router(company_profile_router.router)
app.include_router(contact_router.router)
app.include_router(templates_router.router)
app.include_router(generate_router.router)
app.include_router(projects_router.router)


@app.get("/health")
async def health():
    return {"success": True, "data": {"status": "ok"}}
