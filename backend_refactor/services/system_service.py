from typing import Optional
from fastapi.responses import JSONResponse, Response
from urllib.parse import urlparse
import asyncio
import ipaddress
import requests
try:
    from ..utils import *
except ImportError:
    from utils import *

async def root():
    return envelope({"service": "quotation-mirror", "ok": True})


def _blocked_host(host: str) -> bool:
    if not host:
        return True
    h = host.lower().strip("[]")
    if h in ("localhost", "127.0.0.1", "::1", "0.0.0.0"):
        return True
    try:
        ip = ipaddress.ip_address(h)
        return bool(ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved)
    except ValueError:
        return h.endswith(".local") or h.endswith(".internal")


async def media_proxy(url: str):
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or _blocked_host(parsed.hostname or ""):
        return JSONResponse(status_code=400, content=envelope(None, False, "Invalid image URL"))

    def fetch():
        r = requests.get(
            url,
            timeout=20,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            },
        )
        r.raise_for_status()
        return r.content, r.headers.get("Content-Type", "image/jpeg")

    try:
        content, ctype = await asyncio.to_thread(fetch)
    except Exception:
        return JSONResponse(status_code=404, content=envelope(None, False, "Image could not be loaded"))
    ctype = (ctype or "image/jpeg").split(";")[0].strip()
    if not ctype.startswith("image/"):
        if content[:3] == b"\xff\xd8\xff":
            ctype = "image/jpeg"
        elif content[:8] == b"\x89PNG\r\n\x1a\n":
            ctype = "image/png"
        elif content[:6] in (b"GIF87a", b"GIF89a"):
            ctype = "image/gif"
        else:
            return JSONResponse(status_code=404, content=envelope(None, False, "URL is not an image"))
    return Response(content=content, media_type=ctype, headers={"Cache-Control": "public, max-age=86400"})
