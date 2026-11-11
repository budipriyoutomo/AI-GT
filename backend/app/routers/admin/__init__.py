"""Router panel admin — semua endpoint di bawah /api/v1/admin.

Aturan (AGENTS.md §4 + catatan keamanan MVP_AUDIT_TODO):
- Setiap router WAJIB memakai dependency get_current_admin, bukan get_current_user.
- Tidak boleh ada password_hash di response manapun.
"""
from fastapi import APIRouter, Depends

from app.models.user import User
from app.utils.auth import get_current_admin

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("/ping")
async def ping(current_admin: User = Depends(get_current_admin)):
    """Cek akses admin — dipakai guard sisi klien untuk memutuskan redirect."""
    return {
        "success": True,
        "data": {
            "id": str(current_admin.id),
            "email": current_admin.email,
            "name": current_admin.name,
            "role": current_admin.role,
        },
    }


# Sub-router diimpor di bawah supaya `router` sudah terdefinisi.
from app.routers.admin import audit_logs, messages, metrics, payments, storage, templates, users  # noqa: E402

router.include_router(payments.router)
router.include_router(messages.router)
router.include_router(users.router)
router.include_router(audit_logs.router)
router.include_router(metrics.router)
router.include_router(storage.router)
router.include_router(templates.router)
router.include_router(templates.drafts_router)
