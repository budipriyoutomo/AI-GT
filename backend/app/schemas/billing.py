import uuid
from datetime import datetime

from pydantic import BaseModel, model_validator


class PlanData(BaseModel):
    id: str
    name: str
    price: int
    generate_limit: int
    history_limit: int
    profile_limit: int
    thematic_image: bool
    watermark_free: bool
    priority_support: bool


class AddonData(BaseModel):
    id: str
    name: str
    price: int
    extra_slots: int


class PlansResponse(BaseModel):
    plans: list[PlanData]
    addons: list[AddonData]


class UsageData(BaseModel):
    generate_used: int
    generate_limit: int
    history_used: int
    history_limit: int


class SubscriptionData(BaseModel):
    plan_id: str
    plan_name: str
    status: str
    current_period_end: datetime | None
    storage_addon_id: str | None
    usage: UsageData


class OrderCreate(BaseModel):
    plan_id: str | None = None
    addon_id: str | None = None

    @model_validator(mode="after")
    def exactly_one(self) -> "OrderCreate":
        if bool(self.plan_id) == bool(self.addon_id):
            raise ValueError("Isi salah satu: plan_id ATAU addon_id.")
        return self


class BankInstruction(BaseModel):
    bank_name: str
    account_number: str
    account_holder: str


class OrderData(BaseModel):
    id: uuid.UUID
    kind: str  # "plan" | "addon"
    item_id: str
    item_name: str
    amount: int
    unique_code: int
    total_amount: int
    status: str
    proof_url: str | None
    bank: BankInstruction
    created_at: datetime
    expires_at: datetime | None
    paid_at: datetime | None
