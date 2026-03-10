"""add delivered_at to messages

Revision ID: b8b9ad52d8d6
Revises: cafcde9b8cc6
Create Date: 2026-03-10 02:56:14.136224

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b8b9ad52d8d6'
down_revision: Union[str, None] = 'cafcde9b8cc6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("messages", sa.Column("delivered_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("messages", "delivered_at")

