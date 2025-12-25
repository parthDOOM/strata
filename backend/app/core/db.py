"""
Database configuration and session management.

Provides SQLite engine initialization, table creation,
and FastAPI dependency for session injection.
"""

from collections.abc import Generator
from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine

from app.core.config import settings

# Ensure the data directory exists
_data_dir = Path(__file__).parent.parent.parent.parent / "data"
_data_dir.mkdir(parents=True, exist_ok=True)

# SQLite database path
_db_path = _data_dir / "quant.db"
DATABASE_URL = f"sqlite:///{_db_path}"

# Create engine with SQLite-specific settings
# check_same_thread=False is required for FastAPI's async context
engine = create_engine(
    DATABASE_URL,
    echo=settings.is_development,  # Log SQL in development
    connect_args={"check_same_thread": False},
)


def create_db_and_tables() -> None:
    """
    Create all database tables.

    Should be called on application startup or in migration scripts.
    Uses SQLModel's metadata to create tables if they don't exist.
    """
    # Import models to register them with SQLModel metadata
    from app.models import market_data  # noqa: F401

    SQLModel.metadata.create_all(engine)
    print(f"Database initialized at: {_db_path}")


def get_session() -> Generator[Session, None, None]:
    """
    FastAPI dependency for database sessions.

    Yields a SQLModel Session and ensures proper cleanup.
    Usage:
        @app.get("/items")
        def get_items(session: Session = Depends(get_session)):
            ...
    """
    with Session(engine) as session:
        yield session
