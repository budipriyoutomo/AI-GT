from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
    TokenData,
    UserData,
)
from app.services import auth_service
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/register", status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    user = await auth_service.register_user(db, body.name, body.email, body.password)
    provider = auth_service.get_auth_provider()
    token = provider.create_token(str(user.id))
    return {
        "success": True,
        "data": {
            **TokenData(access_token=token).model_dump(),
            "user": UserData.model_validate(user).model_dump(),
        },
        "message": "Registrasi berhasil. Silakan verifikasi email kamu.",
    }


@router.post("/login")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    user, token = await auth_service.login_user(db, body.email, body.password)
    return {
        "success": True,
        "data": {
            **TokenData(access_token=token).model_dump(),
            "user": UserData.model_validate(user).model_dump(),
        },
    }


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "success": True,
        "data": UserData.model_validate(current_user).model_dump(),
    }


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await auth_service.change_password(
        db, current_user, body.current_password, body.new_password
    )
    return {"success": True, "data": None, "message": "Password berhasil diubah."}


@router.delete("/me")
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await auth_service.delete_account(db, current_user)
    return {"success": True, "data": None, "message": "Akun berhasil dihapus."}
