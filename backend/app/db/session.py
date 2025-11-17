from sqlmodel import Session, SQLModel, create_engine

from app.core.config import settings

engine = create_engine(
    settings.database_url,
    echo=False,
    connect_args={"check_same_thread": False} if settings.database_url.startswith("sqlite") else {},
)


def get_session() -> Session:
    with Session(engine) as session:
        yield session


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)

