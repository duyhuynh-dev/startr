from fastapi import APIRouter

from app.api.v1.endpoints import admin, diligence, feed, matches, messaging, profiles, prompts, ml

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

