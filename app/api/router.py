from fastapi import APIRouter

from app.api.routes import (
    admin,
    auth,
    carecircle,
    caregiver,
    chat,
    cycle,
    doctor,
    herreach,
    notifications,
    nutrition,
    pcos,
    ppd,
    wellness,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(wellness.router)
api_router.include_router(cycle.router)
api_router.include_router(pcos.router)
api_router.include_router(ppd.router)
api_router.include_router(chat.router)
api_router.include_router(caregiver.router)
api_router.include_router(carecircle.router)
api_router.include_router(doctor.router)
api_router.include_router(herreach.router)
api_router.include_router(nutrition.router)
api_router.include_router(admin.router)
api_router.include_router(notifications.router)
