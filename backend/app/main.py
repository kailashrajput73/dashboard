import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.exception_handlers import request_validation_exception_handler
from starlette.middleware.cors import CORSMiddleware

from .errors import AuthenticationError
from .routers import (
    auth,
    catalog,
    dispatch_inventory,
    partners_team,
    purchases_rfq,
    subcategories,
    taxonomy,
)

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


async def request_validation_error_response(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    path = request.url.path
    operational_path = (
        path
        in {
            "/api/purchases",
            "/api/purchases/import",
            "/api/rfqs",
            "/api/dispatches",
            "/api/inventory",
        }
        or path.startswith("/api/rfqs/")
        or path.startswith("/api/inventory/")
        or (
            path.startswith("/api/partners/")
            and path.endswith("/rewards")
        )
    )
    if (
        path == "/api/catalog"
        or path.startswith("/api/catalog/")
        or operational_path
    ):
        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "data": None,
                "error": "Request validation failed",
            },
        )
    return await request_validation_exception_handler(request, exc)


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
    app.add_exception_handler(
        RequestValidationError,
        request_validation_error_response,
    )
    app.include_router(auth.router)
    app.include_router(catalog.router)
    app.include_router(purchases_rfq.router)
    app.include_router(dispatch_inventory.router)
    app.include_router(partners_team.router)
    app.include_router(taxonomy.router)
    app.include_router(subcategories.router)

    @app.get("/api/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
