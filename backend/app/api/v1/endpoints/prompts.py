from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session

from app.core.exceptions import NotFoundError
from app.db.session import get_session
from app.schemas.prompt_template import (
    PromptTemplateCreate,
    PromptTemplateResponse,
    PromptTemplateUpdate,
)
from app.services.prompt_templates import prompt_template_service

router = APIRouter()


@router.post("", response_model=PromptTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_template(
    payload: PromptTemplateCreate, session: Session = Depends(get_session)
) -> PromptTemplateResponse:
    """Create a new prompt template."""
    template = prompt_template_service.create_template(session, payload)
    return PromptTemplateResponse(**template.model_dump())


@router.get("/{template_id}", response_model=PromptTemplateResponse)
def get_template(
    template_id: str, session: Session = Depends(get_session)
) -> PromptTemplateResponse:
    """Get a specific prompt template by ID."""
    template = prompt_template_service.get_template(session, template_id)
    if not template:
        raise NotFoundError(resource="Prompt template", identifier=template_id)
    return PromptTemplateResponse(**template.model_dump())


@router.get("", response_model=List[PromptTemplateResponse])
def list_templates(
    role: Optional[str] = Query(None, description="Filter by role: investor or founder"),
    is_active: Optional[bool] = Query(
        True, description="Filter by active status (default: True)"
    ),
    session: Session = Depends(get_session),
) -> List[PromptTemplateResponse]:
    """List all prompt templates, optionally filtered by role and active status."""
    templates = prompt_template_service.list_templates(session, role, is_active)
    return [PromptTemplateResponse(**template.model_dump()) for template in templates]


@router.put("/{template_id}", response_model=PromptTemplateResponse)
def update_template(
    template_id: str,
    payload: PromptTemplateUpdate,
    session: Session = Depends(get_session),
) -> PromptTemplateResponse:
    """Update a prompt template."""
    template = prompt_template_service.update_template(session, template_id, payload)
    if not template:
        raise NotFoundError(resource="Prompt template", identifier=template_id)
    return PromptTemplateResponse(**template.model_dump())


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(
    template_id: str, session: Session = Depends(get_session)
) -> None:
    """Delete a prompt template."""
    success = prompt_template_service.delete_template(session, template_id)
    if not success:
        raise NotFoundError(resource="Prompt template", identifier=template_id)

