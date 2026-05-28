from fastapi import APIRouter

from app.routes.admin import analytics, auth, payments, settings, users, words

router = APIRouter(prefix="/api/admin", tags=["admin"])
router.include_router(auth.router)
router.include_router(words.router)
router.include_router(users.router)
router.include_router(payments.router)
router.include_router(analytics.router)
router.include_router(settings.router)
