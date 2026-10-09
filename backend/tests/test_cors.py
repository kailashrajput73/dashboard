import asyncio
import json
import os
import unittest
from typing import Any
from unittest.mock import patch

from starlette.middleware.cors import CORSMiddleware

from app.main import DEFAULT_CORS_ORIGINS, create_app


def send_request(
    app: Any,
    method: str,
    path: str,
    headers: list[tuple[bytes, bytes]],
) -> tuple[int, dict[bytes, bytes], bytes]:
    async def run_request() -> tuple[int, dict[bytes, bytes], bytes]:
        messages: list[dict[str, Any]] = []

        async def receive() -> dict[str, Any]:
            return {"type": "http.request", "body": b"", "more_body": False}

        async def send(message: dict[str, Any]) -> None:
            messages.append(message)

        await app(
            {
                "type": "http",
                "asgi": {"version": "3.0", "spec_version": "2.3"},
                "http_version": "1.1",
                "method": method,
                "scheme": "http",
                "path": path,
                "raw_path": path.encode(),
                "query_string": b"",
                "root_path": "",
                "headers": headers,
                "client": ("testclient", 50000),
                "server": ("testserver", 80),
            },
            receive,
            send,
        )

        response_start = next(
            message for message in messages if message["type"] == "http.response.start"
        )
        response_body = next(
            message for message in messages if message["type"] == "http.response.body"
        )
        return (
            response_start["status"],
            dict(response_start["headers"]),
            response_body.get("body", b""),
        )

    return asyncio.run(run_request())


class CorsMiddlewareTests(unittest.TestCase):
    def test_allowed_origin_gets_reflected_origin_and_health_json(self) -> None:
        app = create_app()
        origin = "http://localhost:5173"

        status, headers, body = send_request(
            app,
            "GET",
            "/api/health",
            [(b"origin", origin.encode())],
        )

        self.assertEqual(status, 200)
        self.assertEqual(headers[b"access-control-allow-origin"], origin.encode())
        self.assertNotEqual(headers[b"access-control-allow-origin"], b"*")
        self.assertEqual(headers[b"access-control-allow-credentials"], b"true")
        self.assertEqual(json.loads(body), {"status": "ok"})

    def test_allowed_preflight_allows_authorization_and_content_type(self) -> None:
        app = create_app()
        origin = "http://localhost:8081"

        status, headers, _ = send_request(
            app,
            "OPTIONS",
            "/api/health",
            [
                (b"origin", origin.encode()),
                (b"access-control-request-method", b"GET"),
                (b"access-control-request-headers", b"authorization,content-type"),
            ],
        )

        self.assertEqual(status, 200)
        self.assertEqual(headers[b"access-control-allow-origin"], origin.encode())
        self.assertEqual(headers[b"access-control-allow-credentials"], b"true")
        self.assertIn(b"authorization", headers[b"access-control-allow-headers"])
        self.assertIn(b"content-type", headers[b"access-control-allow-headers"])

    def test_disallowed_origin_gets_no_credentialed_cors_allowance(self) -> None:
        app = create_app()

        status, headers, _ = send_request(
            app,
            "OPTIONS",
            "/api/health",
            [
                (b"origin", b"https://not-allowed.example"),
                (b"access-control-request-method", b"GET"),
                (b"access-control-request-headers", b"authorization"),
            ],
        )

        self.assertEqual(status, 400)
        self.assertNotIn(b"access-control-allow-origin", headers)

    def test_app_registers_exactly_one_cors_middleware(self) -> None:
        app = create_app()
        cors_middleware = [
            middleware
            for middleware in app.user_middleware
            if middleware.cls is CORSMiddleware
        ]

        self.assertEqual(len(cors_middleware), 1)

    def test_env_origins_are_merged_and_deduplicated(self) -> None:
        with patch.dict(
            os.environ,
            {"CORS_ORIGINS": " https://admin.example, http://localhost:5173 "},
        ):
            app = create_app()

        cors_middleware = next(
            middleware
            for middleware in app.user_middleware
            if middleware.cls is CORSMiddleware
        )
        origins = cors_middleware.kwargs["allow_origins"]
        self.assertEqual(origins.count("http://localhost:5173"), 1)
        self.assertIn("https://admin.example", origins)
        self.assertEqual(origins[: len(DEFAULT_CORS_ORIGINS)], list(DEFAULT_CORS_ORIGINS))

    def test_env_rejects_wildcard_with_credentials(self) -> None:
        with patch.dict(os.environ, {"CORS_ORIGINS": "*"}):
            with self.assertRaisesRegex(ValueError, "cannot contain"):
                create_app()


if __name__ == "__main__":
    unittest.main()
