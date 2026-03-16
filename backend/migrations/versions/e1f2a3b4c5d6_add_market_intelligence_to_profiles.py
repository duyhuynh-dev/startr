"""add market intelligence fields to profiles

Revision ID: e1f2a3b4c5d6
Revises: 6d2a6ef4bb4b
Create Date: 2026-03-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e1f2a3b4c5d6"
down_revision: Union[str, None] = "6d2a6ef4bb4b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("profiles", sa.Column("financial_health", sa.JSON(), nullable=True))
    op.add_column("profiles", sa.Column("market_sentiment", sa.String(), nullable=True))
    op.add_column("profiles", sa.Column("niche_moat", sa.Text(), nullable=True))
    op.add_column("profiles", sa.Column("competitor_gap", sa.JSON(), nullable=False, server_default="[]"))
    op.add_column("profiles", sa.Column("intelligence_sources", sa.JSON(), nullable=False, server_default="[]"))


def downgrade() -> None:
    op.drop_column("profiles", "intelligence_sources")
    op.drop_column("profiles", "competitor_gap")
    op.drop_column("profiles", "niche_moat")
    op.drop_column("profiles", "market_sentiment")
    op.drop_column("profiles", "financial_health")
