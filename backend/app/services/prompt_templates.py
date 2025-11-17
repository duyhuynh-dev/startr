from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from sqlalchemy import select
from sqlmodel import Session

from app.models.prompt_template import PromptTemplate
from app.schemas.prompt_template import PromptTemplateCreate, PromptTemplateUpdate


class PromptTemplateService:
    """Manages prompt templates for profile builders."""

    def create_template(
        self, session: Session, payload: PromptTemplateCreate
    ) -> PromptTemplate:
        template = PromptTemplate(**payload.model_dump())
        session.add(template)
        session.commit()
        session.refresh(template)
        return template

    def get_template(self, session: Session, template_id: str) -> Optional[PromptTemplate]:
        return session.get(PromptTemplate, template_id)

    def list_templates(
        self,
        session: Session,
        role: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> List[PromptTemplate]:
        query = select(PromptTemplate)
        
        if role:
            query = query.where(PromptTemplate.role == role)
        if is_active is not None:
            query = query.where(PromptTemplate.is_active == is_active)
        
        query = query.order_by(PromptTemplate.display_order.asc(), PromptTemplate.created_at.asc())
        
        return list(session.exec(query).all())

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
        return template

    def delete_template(self, session: Session, template_id: str) -> bool:
        template = session.get(PromptTemplate, template_id)
        if not template:
            return False
        
        session.delete(template)
        session.commit()
        return True


prompt_template_service = PromptTemplateService()

