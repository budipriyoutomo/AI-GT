from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth as auth_router
from app.utils.exceptions import AppError, app_error_handler


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="AI-GT API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppError, app_error_handler)

app.include_router(auth_router.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
