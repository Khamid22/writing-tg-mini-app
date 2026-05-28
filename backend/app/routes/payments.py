from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import current_user
from app.models import LearnerUser
from app.routes.admin.auth import require_admin
from app.schemas import ManualPaymentDecisionRequest, ManualPaymentRequestResponse, ManualPaymentSubmitRequest
from app.services.payments import (
    approve_payment,
    cancel_payment,
    create_payment_request,
    get_active_payment_request,
    payment_payload,
    submit_payment_screenshot,
)

router = APIRouter(prefix="/api/mini/payments/manual", tags=["manual payments"])
admin_router = APIRouter(
    prefix="/api/admin/payments/manual",
    tags=["admin manual payments"],
    dependencies=[Depends(require_admin)],
)


@router.post("/request", response_model=ManualPaymentRequestResponse)
def request_payment(user: LearnerUser = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    return payment_payload(create_payment_request(db, user))


@router.get("/current", response_model=ManualPaymentRequestResponse | None)
def current_payment(user: LearnerUser = Depends(current_user), db: Session = Depends(get_db)) -> dict | None:
    payment = get_active_payment_request(db, user)
    return payment_payload(payment) if payment else None


@admin_router.post("/{code}/submit-screenshot", response_model=ManualPaymentRequestResponse)
def submit_screenshot(code: str, payload: ManualPaymentSubmitRequest, db: Session = Depends(get_db)) -> dict:
    payment = submit_payment_screenshot(db, code, payload.screenshot_file_id, payload.admin_note)
    return payment_payload(payment)


@admin_router.post("/{code}/approve", response_model=ManualPaymentRequestResponse)
def approve(code: str, payload: ManualPaymentDecisionRequest, db: Session = Depends(get_db)) -> dict:
    return payment_payload(approve_payment(db, code, payload.admin_id, payload.note))


@admin_router.post("/{code}/cancel", response_model=ManualPaymentRequestResponse)
def cancel(code: str, payload: ManualPaymentDecisionRequest, db: Session = Depends(get_db)) -> dict:
    return payment_payload(cancel_payment(db, code, payload.admin_id, payload.note))
