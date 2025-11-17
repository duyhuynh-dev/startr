from fastapi import APIRouter

from app.api.v1.endpoints import diligence, matches, messaging, profiles, prompts

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
    diligence.router,
    prefix="/v1/diligence",
    tags=["diligence"],
)

