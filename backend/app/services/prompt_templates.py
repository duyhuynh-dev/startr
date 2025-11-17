from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from sqlalchemy import select
from sqlmodel import Session

from app.core.cache import CACHE_TTL_VERY_LONG, cache_service
from app.models.prompt_template import PromptTemplate
from app.schemas.prompt_template import PromptTemplateCreate, PromptTemplateUpdate


class PromptTemplateService:
    """Manages prompt templates for profile builders."""

    TEMPLATE_CACHE_TTL = CACHE_TTL_VERY_LONG  # 24 hours - templates change rarely

    def create_template(
        self, session: Session, payload: PromptTemplateCreate
    ) -> PromptTemplate:
        template = PromptTemplate(**payload.model_dump())
        session.add(template)
        session.commit()
        session.refresh(template)
        
        # Cache the new template
        cache_service.set(
            cache_service.get_prompt_template_key(template.id),
            template.model_dump(),
            self.TEMPLATE_CACHE_TTL,
        )
        
        # Invalidate list caches
        cache_service.delete_pattern(f"{cache_service.PROMPT_TEMPLATE_CACHE_PREFIX}list:*")
        
        return template

    def get_template(self, session: Session, template_id: str) -> Optional[PromptTemplate]:
        """Get template from cache or database."""
        cache_key = cache_service.get_prompt_template_key(template_id)
        
        cached = cache_service.get(cache_key)
        if cached:
            return PromptTemplate(**cached)
        
        template = session.get(PromptTemplate, template_id)
        if template:
            cache_service.set(cache_key, template.model_dump(), self.TEMPLATE_CACHE_TTL)
        
        return template

    def list_templates(
        self,
        session: Session,
        role: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> List[PromptTemplate]:
        """List templates with optional caching."""
        # Build cache key based on filters
        cache_key = f"{cache_service.PROMPT_TEMPLATE_CACHE_PREFIX}list:{role or 'all'}:{is_active if is_active is not None else 'all'}"
        
        cached = cache_service.get(cache_key)
        if cached:
            return [PromptTemplate(**t) for t in cached]
        
        query = select(PromptTemplate)
        
        if role:
            query = query.where(PromptTemplate.role == role)
        if is_active is not None:
            query = query.where(PromptTemplate.is_active == is_active)
        
        query = query.order_by(PromptTemplate.display_order.asc(), PromptTemplate.created_at.asc())
        
        templates = list(session.exec(query).all())
        
        # Cache the result
        cache_service.set(
            cache_key,
            [t.model_dump() for t in templates],
            self.TEMPLATE_CACHE_TTL,
        )
        
        return templates

    def update_template(
        self, session: Session, template_id: str, payload: PromptTemplateUpdate
    ) -> Optional[PromptTemplate]:
        template = session.get(PromptTemplate, template_id)
        if not template:
            return None

        update_data = payload.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(template, key, value)
        
        template.updated_at = datetime.utcnow()
        session.add(template)
        session.commit()
        session.refresh(template)
        
        # Update cache
        cache_service.set(
            cache_service.get_prompt_template_key(template_id),
            template.model_dump(),
            self.TEMPLATE_CACHE_TTL,
        )
        
        # Invalidate list caches
        cache_service.delete_pattern(f"{cache_service.PROMPT_TEMPLATE_CACHE_PREFIX}list:*")
        
        return template

    def delete_template(self, session: Session, template_id: str) -> bool:
        template = session.get(PromptTemplate, template_id)
        if not template:
            return False
        
        session.delete(template)
        session.commit()
        
        # Invalidate cache
        cache_service.delete(cache_service.get_prompt_template_key(template_id))
        cache_service.delete_pattern(f"{cache_service.PROMPT_TEMPLATE_CACHE_PREFIX}list:*")
        
        return True


prompt_template_service = PromptTemplateService()

