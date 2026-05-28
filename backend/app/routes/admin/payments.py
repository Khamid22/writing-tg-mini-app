from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db
from app.models import PaymentRequest, PaymentStatus
from app.routes.admin.auth import require_admin
from app.routes.admin.serializers import serialize_payment
from app.services.payments import approve_payment, cancel_payment

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("/payments")
def list_payments(
    status: str = "all",
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> dict:
    query = select(PaymentRequest).options(selectinload(PaymentRequest.user))
    count_query = select(func.count(PaymentRequest.id))
    if status != "all":
        query = query.where(PaymentRequest.status == status)
        count_query = count_query.where(PaymentRequest.status == status)

    total = db.scalar(count_query) or 0
    payments = list(db.scalars(query.order_by(PaymentRequest.created_at.desc()).limit(limit).offset(offset)))

    count_rows = db.execute(
        select(PaymentRequest.status, func.count(PaymentRequest.id))
        .group_by(PaymentRequest.status)
    ).all()
    counts = {row[0]: int(row[1]) for row in count_rows}

    return {
        "total": total,
        "counts": {
            "pending": counts.get(PaymentStatus.PENDING.value, 0),
            "submitted": counts.get(PaymentStatus.SUBMITTED.value, 0),
            "approved": counts.get(PaymentStatus.APPROVED.value, 0),
            "cancelled": counts.get(PaymentStatus.CANCELLED.value, 0),
        },
        "items": [serialize_payment(p) for p in payments],
    }


@router.post("/payments/{code}/approve")
def approve(code: str, db: Session = Depends(get_db)) -> dict:
    return serialize_payment(approve_payment(db, code, admin_id="admin-panel"))


@router.post("/payments/{code}/cancel")
def cancel(code: str, db: Session = Depends(get_db)) -> dict:
    return serialize_payment(cancel_payment(db, code, admin_id="admin-panel"))
