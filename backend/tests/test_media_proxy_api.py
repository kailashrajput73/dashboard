from __future__ import annotations

import unittest
from unittest.mock import patch

import httpx2
from fastapi.testclient import TestClient

from app.main import app
from app.routers.media_proxy import router as media_proxy_router


class _FakeAsyncClient:
    def __init__(self, responses: list[httpx2.Response]) -> None:
        self.responses = responses
        self.requested_urls: list[str] = []

    async def __aenter__(self) -> _FakeAsyncClient:
        return self

    async def __aexit__(self, *_args: object) -> None:
        del _args
        return None

    async def get(
        self,
        url: str,
        *,
        headers: dict[str, str],
    ) -> httpx2.Response:
        self.requested_urls.append(url)
        self.request_headers = headers
        return self.responses.pop(0)


class MediaProxyRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def tearDown(self) -> None:
        self.client.close()

    @staticmethod
    def _response(
        status_code: int,
        *,
        content: bytes = b"",
        headers: dict[str, str] | None = None,
        url: str = "https://images.example.test/photo",
    ) -> httpx2.Response:
        return httpx2.Response(
            status_code,
            headers=headers,
            content=content,
            request=httpx2.Request("GET", url),
        )

    def _get_with_responses(
        self,
        url: str,
        responses: list[httpx2.Response],
    ) -> tuple[httpx2.Response, _FakeAsyncClient]:
        fake_client = _FakeAsyncClient(responses)
        with patch(
            "app.services.media_proxy_service.httpx2.AsyncClient",
            return_value=fake_client,
        ):
            response = self.client.get(
                "/api/media/proxy",
                params={"url": url},
            )
        return response, fake_client

    def test_returns_image_bytes_and_content_type(self) -> None:
        image = b"\xff\xd8\xffjpeg-image"
        response, client = self._get_with_responses(
            "https://images.example.test/photo",
            [
                self._response(
                    200,
                    content=image,
                    headers={"content-type": "image/jpeg; charset=binary"},
                )
            ],
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, image)
        self.assertEqual(response.headers["content-type"], "image/jpeg")
        self.assertEqual(
            response.headers["cache-control"],
            "public, max-age=86400",
        )
        self.assertEqual(
            client.requested_urls,
            ["https://images.example.test/photo"],
        )
        self.assertEqual(
            client.request_headers,
            {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
                "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            },
        )

    def test_sniffs_png_when_upstream_content_type_is_not_an_image(self) -> None:
        image = b"\x89PNG\r\n\x1a\npng-data"
        response, _ = self._get_with_responses(
            "https://images.example.test/photo",
            [
                self._response(
                    200,
                    content=image,
                    headers={"content-type": "text/plain"},
                )
            ],
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, image)
        self.assertEqual(response.headers["content-type"], "image/png")

    def test_rejects_private_redirect_destinations(self) -> None:
        response, client = self._get_with_responses(
            "https://images.example.test/photo",
            [
                self._response(
                    302,
                    headers={"location": "http://127.0.0.1/private"},
                )
            ],
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json(),
            {
                "success": False,
                "data": None,
                "error": "Invalid image URL",
            },
        )
        self.assertEqual(len(client.requested_urls), 1)

    def test_non_image_upstream_returns_error_envelope(self) -> None:
        response, _ = self._get_with_responses(
            "https://images.example.test/page",
            [
                self._response(
                    200,
                    content=b"<html>not an image</html>",
                    headers={"content-type": "text/html"},
                )
            ],
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json(),
            {
                "success": False,
                "data": None,
                "error": "URL is not an image",
            },
        )

    def test_rejects_local_urls_without_fetching(self) -> None:
        response = self.client.get(
            "/api/media/proxy",
            params={"url": "http://localhost/private"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "Invalid image URL")

    def test_rejects_malformed_port_as_invalid_url(self) -> None:
        response = self.client.get(
            "/api/media/proxy",
            params={"url": "https://images.example.test:not-a-port/photo"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "Invalid image URL")

    def test_missing_url_uses_standard_validation_envelope(self) -> None:
        response = self.client.get("/api/media/proxy")

        self.assertEqual(response.status_code, 422)
        self.assertEqual(
            response.json(),
            {
                "success": False,
                "data": None,
                "error": "Request validation failed",
            },
        )

    def test_app_registers_only_media_proxy_route(self) -> None:
        operations = app.openapi()["paths"]["/api/media/proxy"]
        self.assertEqual(set(operations), {"get"})
        self.assertNotIn("/api/", app.openapi()["paths"])
        self.assertEqual(
            [(route.path, route.methods) for route in media_proxy_router.routes],
            [("/api/media/proxy", {"GET"})],
        )
