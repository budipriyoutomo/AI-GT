import uuid

from fastapi import APIRouter, Depends, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.payment_order import PaymentOrder
from app.models.user import User
from app.schemas.billing import (
    BankInstruction,
    OrderCreate,
    OrderData,
    PlansResponse,
    SubscriptionData,
    UsageData,
)
from app.services import billing_plans, billing_service
from app.utils.auth import get_current_user
from app.utils.exceptions import AppError, ErrorCode

router = APIRouter(prefix="/api/v1/billing", tags=["billing"])

_ALLOWED_PROOF_TYPES = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}


def _bank() -> BankInstruction:
    return BankInstruction(
        bank_name=settings.billing_bank_name,
        account_number=settings.billing_bank_account,
        account_holder=settings.billing_bank_holder,
    )


def _order_data(order: PaymentOrder) -> dict:
    if order.kind == "plan":
        item = billing_plans.get_plan(order.item_id)
    else:
        item = billing_plans.get_addon(order.item_id)
    item_name = item["name"] if item else order.item_id
    return OrderData(
        id=order.id,
        kind=order.kind,
        item_id=order.item_id,
        item_name=item_name,
        amount=order.amount,
        unique_code=order.unique_code,
        total_amount=order.total_amount,
        status=order.status,
        proof_url=order.proof_url,
        bank=_bank(),
        created_at=order.created_at,
        expires_at=order.expires_at,
        paid_at=order.paid_at,
    ).model_dump()


@router.get("/plans")
async def list_plans():
    catalog = billing_service.get_plans_catalog()
    return {"success": True, "data": PlansResponse.model_validate(catalog).model_dump()}


@router.get("/subscription")
async def get_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sub = await billing_service.get_subscription(db, current_user.id)
    plan = billing_plans.get_plan(sub.plan_id) or billing_plans.get_plan(billing_plans.DEFAULT_PLAN_ID)
    usage = await billing_service.compute_usage(db, current_user.id)
    data = SubscriptionData(
        plan_id=sub.plan_id,
        plan_name=plan["name"],
        status=sub.status,
        current_period_end=sub.current_period_end,
        storage_addon_id=sub.storage_addon_id,
        usage=UsageData(
            generate_used=usage["generate_used"],
            generate_limit=plan["generate_limit"],
            history_used=usage["history_used"],
            history_limit=plan["history_limit"],
        ),
    )
    return {"success": True, "data": data.model_dump()}


@router.post("/orders", status_code=201)
async def create_order(
    body: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    order = await billing_service.create_order(db, current_user.id, body)
    return {"success": True, "data": _order_data(order)}


@router.get("/orders")
async def list_orders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    orders = await billing_service.list_orders(db, current_user.id)
    return {"success": True, "data": [_order_data(o) for o in orders]}


@router.get("/orders/{order_id}")
async def get_order(
    order_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    order = await billing_service.get_order(db, order_id, current_user.id)
    return {"success": True, "data": _order_data(order)}


@router.post("/orders/{order_id}/proof")
async def upload_proof(
    order_id: uuid.UUID,
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ext = _ALLOWED_PROOF_TYPES.get(file.content_type)
    if ext is None:
        raise AppError(400, ErrorCode.STORAGE_UPLOAD_FAILED, "Bukti transfer harus PNG, JPG, atau WEBP.")
    file_data = await file.read()
    order = await billing_service.attach_proof(
        db, order_id, current_user.id, file_data, ext, file.content_type
    )
    return {"success": True, "data": _order_data(order)}
