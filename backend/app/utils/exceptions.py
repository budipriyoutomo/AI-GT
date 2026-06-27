from fastapi import Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    def __init__(self, status_code: int, code: str, message: str):
        self.status_code = status_code
        self.code = code
        self.message = message


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": {"code": exc.code, "message": exc.message}},
    )


# Error code constants
class ErrorCode:
    AUTH_INVALID_CREDENTIALS = "AUTH_INVALID_CREDENTIALS"
    AUTH_EMAIL_NOT_VERIFIED = "AUTH_EMAIL_NOT_VERIFIED"
    AUTH_TOKEN_EXPIRED = "AUTH_TOKEN_EXPIRED"
    PROFILE_NOT_FOUND = "PROFILE_NOT_FOUND"
    TEMPLATE_NOT_FOUND = "TEMPLATE_NOT_FOUND"
    SESSION_NOT_FOUND = "SESSION_NOT_FOUND"
    SESSION_EXPIRED = "SESSION_EXPIRED"
    VARIANT_NOT_SELECTED = "VARIANT_NOT_SELECTED"
    AI_GENERATION_FAILED = "AI_GENERATION_FAILED"
    STORAGE_UPLOAD_FAILED = "STORAGE_UPLOAD_FAILED"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    FEATURE_REQUIRES_PREMIUM = "FEATURE_REQUIRES_PREMIUM"
