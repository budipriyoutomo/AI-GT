import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.user import User


class AdminUserRef(BaseModel):
    """Ringkasan user di response admin — sengaja TANPA password_hash."""
    id: uuid.UUID
    email: str
    name: str

    @classmethod
    def from_user(cls, user: "User | None") -> "AdminUserRef | None":
        if user is None:
            return None
        return cls(id=user.id, email=user.email, name=user.name)


class AdminOrderData(BaseModel):
    id: uuid.UUID
    user: AdminUserRef | None
    kind: str  # "plan" | "addon"
    item_id: str
    item_name: str
    amount: int
    unique_code: int
    total_amount: int
    status: str
    # Bukti transfer dibaca lewat GET /admin/orders/{id}/proof, bukan URL mentah.
    has_proof: bool
    created_at: datetime
    expires_at: datetime | None
    paid_at: datetime | None
    rejection_reason: str | None
    reviewed_by: AdminUserRef | None
    reviewed_at: datetime | None


class RejectOrderRequest(BaseModel):
    # Panjang divalidasi di service supaya error-nya 400 berformat AGENTS.md §4.
    reason: str = ""


class AdminMessageData(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    category: str | None
    message: str
    status: str  # "new" | "read" | "handled"
    created_at: datetime
    handled_by: AdminUserRef | None
    handled_at: datetime | None


class UpdateMessageRequest(BaseModel):
    # Divalidasi di service supaya error-nya 400 berformat AGENTS.md §4.
    status: str = ""
    only_if_new: bool = False


class AdminUserListItem(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    role: str
    is_active: bool
    plan_id: str
    business_name: str | None
    created_at: datetime


class AdminCompanyProfileSummary(BaseModel):
    business_name: str
    industry: str
    logo_url: str | None


class AdminSubscriptionSummary(BaseModel):
    plan_id: str
    plan_name: str
    status: str
    storage_addon_id: str | None
    current_period_end: datetime | None


class AdminUsageSummary(BaseModel):
    generate_used: int
    generate_limit: int
    history_used: int
    history_limit: int


class AdminUserDetail(BaseModel):
    """Detail user untuk admin — sengaja TANPA password_hash."""
    id: uuid.UUID
    email: str
    name: str
    role: str
    is_active: bool
    suspended_at: datetime | None
    suspended_reason: str | None
    created_at: datetime
    company_profile: AdminCompanyProfileSummary | None
    subscription: AdminSubscriptionSummary
    usage: AdminUsageSummary


class SuspendUserRequest(BaseModel):
    # Divalidasi di service supaya error-nya 400 berformat AGENTS.md §4.
    reason: str = ""


class DeleteUserRequest(BaseModel):
    confirm_email: str = ""


class AuditActorRef(BaseModel):
    """id None = akun admin sudah dihapus; email adalah salinan saat aksi terjadi."""
    id: uuid.UUID | None
    email: str


class AdminAuditLogData(BaseModel):
    id: uuid.UUID
    admin: AuditActorRef
    action: str
    target_type: str
    target_id: str
    payload: dict
    created_at: datetime


class UpdateSubscriptionRequest(BaseModel):
    # Semua opsional; validasi kombinasi & rentang di service (400 berformat AGENTS.md §4).
    plan_id: str | None = None
    extend_days: int | None = None
    reset_quota: bool = False


class GrantAddonRequest(BaseModel):
    # None = cabut add-on.
    addon_id: str | None = None


class AdminSessionData(BaseModel):
    """Session generate untuk admin — termasuk error_reason/error_message yang TIDAK dikirim ke user."""
    id: uuid.UUID
    user: AdminUserRef | None
    template_name: str | None
    status: str
    goal: str | None
    platform: str | None
    error_reason: str | None
    error_message: str | None
    created_at: datetime


class JobRunData(BaseModel):
    id: uuid.UUID
    job_name: str
    trigger: str
    triggered_by_email: str | None
    status: str
    result: dict | None
    error_message: str | None
    started_at: datetime
    finished_at: datetime | None

    model_config = {"from_attributes": True}


class AdminTemplateData(BaseModel):
    id: uuid.UUID
    name: str
    industry: str
    theme: str
    copy_intent: str | None
    content_type: str
    thumbnail_url: str
    background_url: str | None
    template_config: dict
    is_premium: bool
    is_active: bool
    created_at: datetime | None
    # Jumlah generate session yang memakai template — >0 berarti tidak bisa dihapus.
    usage_count: int


class TemplateDraftData(BaseModel):
    id: uuid.UUID
    name: str
    industry: str
    theme: str
    copy_intent: str | None
    content_type: str
    is_premium: bool
    template_config: dict
    thumbnail_url: str | None
    background_url: str | None
    source_template_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
