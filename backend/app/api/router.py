from fastapi import APIRouter

from app.api.v1.endpoints import admin, auth, diligence, feed, matches, messaging, profiles, prompts, ml, storage, realtime

api_router = APIRouter()

api_router.include_router(
    profiles.router,
    prefix="/v1/profiles",
    tags=["profiles"],
)

api_router.include_router(
    prompts.router,
    prefix="/v1/prompts",
    tags=["prompts"],
)

api_router.include_router(
    matches.router,
    prefix="/v1/matches",
    tags=["matches"],
)

api_router.include_router(
    messaging.router,
    prefix="/v1/messages",
    tags=["messaging"],
)

api_router.include_router(
    feed.router,
    prefix="/v1/feed",
    tags=["feed"],
)

api_router.include_router(
    diligence.router,
    prefix="/v1/diligence",
    tags=["diligence"],
)

api_router.include_router(
    admin.router,
    prefix="/v1/admin",
    tags=["admin"],
)

api_router.include_router(
    ml.router,
    prefix="/v1/ml",
    tags=["ML"],
)

api_router.include_router(
    auth.router,
    prefix="/v1/auth",
    tags=["Authentication"],
)

api_router.include_router(
    storage.router,
    prefix="/v1/storage",
    tags=["Storage"],
)

api_router.include_router(
    realtime.router,
    prefix="/v1/realtime",
    tags=["Real-time"],
)

