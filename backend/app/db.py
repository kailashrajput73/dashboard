import os
from functools import lru_cache
from pathlib import Path
from typing import Generator

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

BACKEND_DIR = Path(__file__).resolve().parents[1]


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    load_dotenv(BACKEND_DIR / ".env")
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError(
            f"DATABASE_URL is not set; configure it in {BACKEND_DIR / '.env'}."
        )
    return create_engine(database_url)


def get_db_session() -> Generator[Session, None, None]:
    with Session(get_engine()) as session:
        yield session


def dispose_engine() -> None:
    if get_engine.cache_info().currsize:
        get_engine().dispose()
        get_engine.cache_clear()
