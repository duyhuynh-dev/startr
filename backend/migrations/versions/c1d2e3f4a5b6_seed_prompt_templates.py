"""Seed default prompt templates

Revision ID: c1d2e3f4a5b6
Revises: f0a1b2c3d4e5
Create Date: 2026-03-17

"""

from typing import Sequence, Union
from datetime import datetime
import uuid

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c1d2e3f4a5b6"
down_revision: Union[str, None] = "f0a1b2c3d4e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    # If templates already exist, do nothing (idempotent).
    existing = bind.execute(sa.text("SELECT COUNT(1) FROM prompt_templates")).scalar()  # type: ignore
    if existing and int(existing) > 0:
        return

    now = datetime.utcnow()
    prompt_templates = sa.table(
        "prompt_templates",
        sa.column("id", sa.String()),
        sa.column("text", sa.String()),
        sa.column("role", sa.String()),
        sa.column("category", sa.String()),
        sa.column("display_order", sa.Integer()),
        sa.column("is_active", sa.Boolean()),
        sa.column("created_at", sa.DateTime()),
        sa.column("updated_at", sa.DateTime()),
    )

    rows = []

    # Founder prompts
    founder = [
        ("What are you building, and why now?", "mission"),
        ("What traction are you most proud of so far?", "traction"),
        ("What kind of investor or partner are you looking for?", "preferences"),
        ("What’s your biggest challenge right now?", "challenges"),
        ("What’s your unfair advantage?", "moat"),
    ]
    for i, (text, category) in enumerate(founder, start=1):
        rows.append(
            {
                "id": str(uuid.uuid4()),
                "text": text,
                "role": "founder",
                "category": category,
                "display_order": i,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            }
        )

    # Investor prompts
    investor = [
        ("What’s your investment thesis in one paragraph?", "thesis"),
        ("What kinds of founders do you work best with?", "preferences"),
        ("What’s a recent investment (or trend) you’re excited about?", "signals"),
        ("How do you typically help companies post‑investment?", "value_add"),
        ("What would make you say yes quickly?", "process"),
    ]
    for i, (text, category) in enumerate(investor, start=1):
        rows.append(
            {
                "id": str(uuid.uuid4()),
                "text": text,
                "role": "investor",
                "category": category,
                "display_order": i,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            }
        )

    op.bulk_insert(prompt_templates, rows)


def downgrade() -> None:
    bind = op.get_bind()
    # Remove only seeded templates by exact text.
    seeded_texts = [
        "What are you building, and why now?",
        "What traction are you most proud of so far?",
        "What kind of investor or partner are you looking for?",
        "What’s your biggest challenge right now?",
        "What’s your unfair advantage?",
        "What’s your investment thesis in one paragraph?",
        "What kinds of founders do you work best with?",
        "What’s a recent investment (or trend) you’re excited about?",
        "How do you typically help companies post‑investment?",
        "What would make you say yes quickly?",
    ]
    bind.execute(
        sa.text("DELETE FROM prompt_templates WHERE text = ANY(:texts)"),
        {"texts": seeded_texts},
    )

