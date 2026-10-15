# Post-row 21 Layer 1G: media proxy API parity

## Scope

Implement RTE-76 only in the PostgreSQL backend:

- `GET /api/media/proxy?url=...`

The endpoint remains public. It returns raw image bytes with an image
`Content-Type` on success and `{success, data, error}` JSON on failure.
RTE-75 `GET /api/` was not added; the existing `/api/health` route is
unchanged. No Layer 2 work was started.

## Built

- Added a media-proxy router and service and mounted the router in the
  PostgreSQL app.
- The required `url` query parameter is validated before fetch. HTTP and
  HTTPS URLs are allowed; localhost, private, loopback, link-local, reserved
  IP literals, and `.local` / `.internal` hosts are rejected.
- The upstream GET uses the same browser-like User-Agent and image Accept
  header as Mongo, with a 20-second timeout. Redirects are followed manually
  and every redirect URL is revalidated before another request is made.
- On success, the proxy preserves upstream image bytes, normalizes the
  content type, and sets `Cache-Control: public, max-age=86400`. JPEG, PNG,
  and GIF signatures can identify an image when the upstream content type is
  not an image type.
- Invalid URLs return HTTP 400 with `Invalid image URL`. Failed upstream
  requests return HTTP 404 with `Image could not be loaded`; non-image
  content returns HTTP 404 with `URL is not an image`. Missing `url` uses
  the same standard validation envelope.
- `httpx2` was already declared in `backend/requirements.txt`; no dependency
  change or database migration was needed.
- No files in `web/`, `frontend/`, or `backend_refactor/` were changed.

## Files

- `backend/app/main.py`
- `backend/app/routers/media_proxy.py`
- `backend/app/services/media_proxy_service.py`
- `backend/tests/test_media_proxy_api.py`

## Mongo parity notes and remaining work

The route path, query parameter, public access, upstream headers, timeout,
image-byte response, MIME fallback/sniffing, cache header, and error envelope
mirror `backend_refactor`. The PostgreSQL version uses the already declared
`httpx2` async client instead of Mongo's `requests` call in a worker thread.
It validates each redirect destination before following it, while preserving
the public-CDN redirect use case.

Like the Mongo guard, the host filter checks the literal URL hostname; it
does not pin DNS resolutions. The route adds no root `/api/` endpoint and
does not change `/api/health`.

## DB-STANDARDS.md check

1. **Table requirements:** Not applicable; this read-only endpoint adds no
   table.
2. **Relationships:** Not applicable; it reads no database records and adds
   no foreign keys.
3. **Search/filter/sort indexes:** Not applicable; no database query or
   schema change was introduced.
4. **Uniqueness:** Not applicable; no data is stored.
5. **Transactions:** Not applicable; the route performs only an external
   HTTP GET and writes no database rows.
6. **Authentication/authorization:** The route is intentionally public to
   preserve the Mongo proxy and `RemoteImage` contract.
7. **Incoming-data validation:** The required `url` query parameter is
   declared with FastAPI/Pydantic query validation. URL scheme, hostname,
   host safety, redirect targets, and image content are validated before
   returning content.
8. **Audit log:** Not applicable; no create, update, or delete occurs.

## How to test

1. Apply migrations and run the PostgreSQL backend on port 8001:

   ```powershell
   Set-Location C:\Users\Dell\Desktop\dashboard\backend
   .\.venv\Scripts\python.exe -m alembic upgrade head
   .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001
   ```

2. Set the local web app's `VITE_BACKEND_URL` to
   `http://127.0.0.1:8001`, sign in, and open a catalog or product screen that
   displays images. `RemoteImage` first tries the image URL directly, then
   its CDN fallback, then `/api/media/proxy`. Confirm an image displays when
   the direct and CDN requests fail but the source URL is reachable from the
   backend.
3. Optional direct checks:

   ```powershell
   $imageUrl = "https://example.com/path/to/image.jpg"
   $proxyUrl = "http://127.0.0.1:8001/api/media/proxy?url=$([uri]::EscapeDataString($imageUrl))"
   Invoke-WebRequest -Uri $proxyUrl -OutFile "$env:TEMP\proxy-image"

   Invoke-RestMethod `
     -Uri "http://127.0.0.1:8001/api/media/proxy?url=http%3A%2F%2Flocalhost%2Fprivate"
   ```

   The first request should save image bytes; the local URL should return the
   error envelope. Do not add credentials or private-network URLs to a
   browser test.

## Verification and remaining work

Eight focused media-proxy contract tests passed using the Pylance-selected
Python interpreter, covering image bytes and MIME type, signature sniffing,
private/local URL rejection, redirect destination validation, validation
errors, route registration, and the absence of RTE-75. Syntax validation and
Problems checks passed for changed Python files. No live upstream request,
Alembic upgrade, PostgreSQL server, or browser `RemoteImage` flow was run.
Those remain for user verification.

Layer 1G is built. Layer 2 has not been started.
