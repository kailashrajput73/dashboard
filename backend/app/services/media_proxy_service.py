from __future__ import annotations

import ipaddress
from urllib.parse import urljoin, urlsplit

import httpx2
from fastapi.responses import JSONResponse, Response

from app.services._common import envelope

_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)
_ACCEPT = "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"


def _error_response(status_code: int, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content=envelope(None, False, message),
    )


def _blocked_host(host: str) -> bool:
    if not host:
        return True
    normalized = host.lower().strip("[]")
    if normalized in ("localhost", "127.0.0.1", "::1", "0.0.0.0"):
        return True
    try:
        address = ipaddress.ip_address(normalized)
        return bool(
            address.is_private
            or address.is_loopback
            or address.is_link_local
            or address.is_reserved
        )
    except ValueError:
        return normalized.endswith((".local", ".internal"))


def _is_allowed_url(url: str) -> bool:
    try:
        parsed = urlsplit(url)
        parsed.port
    except ValueError:
        return False
    return parsed.scheme in ("http", "https") and not _blocked_host(
        parsed.hostname or "",
    )


def _image_media_type(content: bytes, content_type: str) -> str | None:
    media_type = (content_type or "image/jpeg").split(";", 1)[0].strip()
    if media_type.startswith("image/"):
        return media_type
    if content.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if content[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    return None


async def media_proxy(url: str) -> Response | JSONResponse:
    if not _is_allowed_url(url):
        return _error_response(400, "Invalid image URL")

    headers = {"User-Agent": _USER_AGENT, "Accept": _ACCEPT}
    current_url = url
    try:
        async with httpx2.AsyncClient(timeout=20, follow_redirects=False) as client:
            for _ in range(21):
                if not _is_allowed_url(current_url):
                    return _error_response(400, "Invalid image URL")
                response = await client.get(current_url, headers=headers)
                if response.is_redirect:
                    location = response.headers.get("location")
                    if not location:
                        response.raise_for_status()
                    current_url = urljoin(current_url, location)
                    continue
                response.raise_for_status()
                content = response.content
                content_type = response.headers.get("content-type", "image/jpeg")
                media_type = _image_media_type(content, content_type)
                if media_type is None:
                    return _error_response(404, "URL is not an image")
                return Response(
                    content=content,
                    media_type=media_type,
                    headers={"Cache-Control": "public, max-age=86400"},
                )
    except httpx2.InvalidURL:
        return _error_response(400, "Invalid image URL")
    except httpx2.HTTPError:
        return _error_response(404, "Image could not be loaded")
    except ValueError:
        return _error_response(400, "Invalid image URL")
    return _error_response(404, "Image could not be loaded")
