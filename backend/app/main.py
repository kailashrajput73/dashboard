import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware

from .errors import AuthenticationError

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")

DEFAULT_CORS_ORIGINS = (
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8081",
)


async def authentication_error_response(
    request: Request,
    exc: AuthenticationError,
) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "data": None, "error": exc.detail},
        headers=exc.headers,
    )


def get_cors_origins() -> list[str]:
    extra_origins = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "").split(",")
        if origin.strip()
    ]
    if "*" in extra_origins:
        raise ValueError(
            "CORS_ORIGINS cannot contain '*'; credentialed CORS requires "
            "an explicit origin allow-list."
        )
    return list(dict.fromkeys((*DEFAULT_CORS_ORIGINS, *extra_origins)))


def create_app() -> FastAPI:
    app = FastAPI(title="Quotation API (PostgreSQL)")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=get_cors_origins(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_exception_handler(AuthenticationError, authentication_error_response)

    @app.get("/api/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
