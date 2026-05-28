from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import LearnerTier, LearnerUser, PaymentRequest, PaymentStatus
from app.services.limits import as_aware_utc


def _generate_code() -> str:
    return f"UZ-{secrets.randbelow(900000) + 100000}"


def payment_payload(payment: PaymentRequest) -> dict:
    settings = get_settings()
    return {
        "code": payment.code,
        "status": payment.status,
        "plan": payment.plan,
        "plan_days": payment.plan_days,
        "amount_uzs": payment.amount_uzs,
        "card_label": settings.manual_payment_card_label,
        "expires_at": payment.expires_at.isoformat(),
        "instructions": [
            f"{settings.manual_payment_card_label} kartasiga {payment.amount_uzs:,} UZS to'lang.".replace(",", " "),
            f"Screenshotni botga yuboring va kodni yozing: {payment.code}",
            "Admin tasdiqlagandan keyin premium faollashadi.",
        ],
        "admin_callback_payloads": {
            "approve": f"payment:approve:{payment.code}",
            "cancel": f"payment:cancel:{payment.code}",
        },
    }


def get_active_payment_request(db: Session, user: LearnerUser) -> PaymentRequest | None:
    now = datetime.now(timezone.utc)
    payment = db.scalar(
        select(PaymentRequest)
        .where(
            PaymentRequest.user_id == user.id,
            PaymentRequest.status.in_([PaymentStatus.PENDING.value, PaymentStatus.SUBMITTED.value]),
        )
        .order_by(PaymentRequest.created_at.desc())
        .limit(1)
    )
    if payment and as_aware_utc(payment.expires_at) <= now and payment.status != PaymentStatus.APPROVED.value:
        payment.status = PaymentStatus.EXPIRED.value
        db.commit()
        return None
    return payment


def create_payment_request(db: Session, user: LearnerUser) -> PaymentRequest:
    existing = get_active_payment_request(db, user)
    if existing:
        return existing

    settings = get_settings()
    code = _generate_code()
    while db.scalar(select(PaymentRequest).where(PaymentRequest.code == code)):
        code = _generate_code()

    payment = PaymentRequest(
        code=code,
        user_id=user.id,
        plan=f"premium_{settings.manual_payment_plan_days}_days",
        plan_days=settings.manual_payment_plan_days,
        amount_uzs=settings.manual_payment_amount_uzs,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


def submit_payment_screenshot(
    db: Session,
    code: str,
    screenshot_file_id: str | None,
    admin_note: str | None = None,
) -> PaymentRequest:
    payment = db.scalar(select(PaymentRequest).where(PaymentRequest.code == code))
    if not payment:
        raise HTTPException(status_code=404, detail="Payment request not found")
    if payment.status not in {PaymentStatus.PENDING.value, PaymentStatus.SUBMITTED.value}:
        raise HTTPException(status_code=400, detail="Payment request is no longer active")
    payment.status = PaymentStatus.SUBMITTED.value
    payment.screenshot_file_id = screenshot_file_id
    payment.admin_note = admin_note
    payment.submitted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(payment)
    return payment


def approve_payment(db: Session, code: str, admin_id: str | None = None, note: str | None = None) -> PaymentRequest:
    payment = db.scalar(select(PaymentRequest).where(PaymentRequest.code == code))
    if not payment:
        raise HTTPException(status_code=404, detail="Payment request not found")
    if payment.status == PaymentStatus.APPROVED.value:
        return payment
    if payment.status in {PaymentStatus.CANCELLED.value, PaymentStatus.EXPIRED.value}:
        raise HTTPException(status_code=400, detail="Payment request cannot be approved")

    now = datetime.now(timezone.utc)
    payment.status = PaymentStatus.APPROVED.value
    payment.approved_at = now
    payment.approved_by = admin_id
    payment.admin_note = note or payment.admin_note
    payment.user.tier = LearnerTier.PAID.value
    payment.user.premium_until = now + timedelta(days=payment.plan_days)
    db.commit()
    db.refresh(payment)
    return payment


def cancel_payment(db: Session, code: str, admin_id: str | None = None, note: str | None = None) -> PaymentRequest:
    payment = db.scalar(select(PaymentRequest).where(PaymentRequest.code == code))
    if not payment:
        raise HTTPException(status_code=404, detail="Payment request not found")
    if payment.status == PaymentStatus.APPROVED.value:
        raise HTTPException(status_code=400, detail="Approved payment cannot be cancelled")
    payment.status = PaymentStatus.CANCELLED.value
    payment.cancelled_at = datetime.now(timezone.utc)
    payment.approved_by = admin_id
    payment.admin_note = note or payment.admin_note
    db.commit()
    db.refresh(payment)
    return payment
