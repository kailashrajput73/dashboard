from pathlib import Path
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, text


def main() -> None:
    env_file = Path(__file__).resolve().parents[1] / ".env"
    load_dotenv(env_file)

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise SystemExit(
            f"DATABASE_URL is not set; copy backend/.env.example to "
            f"{env_file} and set the local connection URL."
        )

    engine = create_engine(database_url)
    try:
        with engine.connect() as connection:
            server_version = connection.execute(text("SELECT version()")).scalar_one()
            probe = connection.execute(text("SELECT 1")).scalar_one()
            print(f"Connected to PostgreSQL: {server_version}")
            print(f"SELECT 1: {probe}")
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
