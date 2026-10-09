from fastapi import HTTPException


class AuthenticationError(HTTPException):
    def __init__(self, status_code: int, message: str) -> None:
        headers = {"WWW-Authenticate": "Bearer"} if status_code == 401 else None
        super().__init__(status_code=status_code, detail=message, headers=headers)
