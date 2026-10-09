from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .errors import AuthenticationError

app = FastAPI(title="Quotation API (PostgreSQL)")


@app.exception_handler(AuthenticationError)
async def authentication_error_response(
    request: Request,
    exc: AuthenticationError,
) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "data": None, "error": exc.detail},
        headers=exc.headers,
    )


# Rows 18-20 wiring map: admin RTE-08-18, 20-22, 24-31, 33-55, 57-63, 66,
# 68-74, 78-81; partner RTE-06; public RTE-01-05, 07, 75-77;
# VAL-52 body passcodes remain separate (RTE-19, 23, 32, 56, 64, 65, 67).
