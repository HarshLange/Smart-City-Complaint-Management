from typing import Any, Optional
from fastapi import HTTPException, status


class AppException(HTTPException):
    """Base domain exception with standardized error response shape."""

    def __init__(
        self,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail: str = "Internal server error occurred",
        error_code: str = "INTERNAL_ERROR",
        extra: Optional[Any] = None,
    ):
        super().__init__(
            status_code=status_code,
            detail={"error_code": error_code, "message": detail, "extra": extra},
        )


class EntityNotFoundException(AppException):
    def __init__(self, entity_name: str = "Resource", identifier: str = ""):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{entity_name} {identifier} not found" if identifier else f"{entity_name} not found",
            error_code="NOT_FOUND",
        )


class UnauthorizedException(AppException):
    def __init__(self, detail: str = "Authentication credentials were invalid or missing"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            error_code="UNAUTHORIZED",
        )


class ForbiddenException(AppException):
    def __init__(self, detail: str = "You do not have permission to access this resource"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            error_code="FORBIDDEN",
        )


class BadRequestException(AppException):
    def __init__(self, detail: str = "Invalid request payload", error_code: str = "BAD_REQUEST"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code=error_code,
        )


class ConflictException(AppException):
    def __init__(self, detail: str = "Resource conflict detected", error_code: str = "CONFLICT"):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
            error_code=error_code,
        )


class InvalidTransitionException(AppException):
    def __init__(self, current_status: str, target_status: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition complaint from '{current_status}' to '{target_status}'",
            error_code="INVALID_STATE_TRANSITION",
        )


class RateLimitExceededException(AppException):
    def __init__(self, detail: str = "Too many requests. Please try again later."):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail,
            error_code="RATE_LIMIT_EXCEEDED",
        )


class InferenceException(AppException):
    def __init__(self, detail: str = "Machine learning inference pipeline failure"):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            error_code="INFERENCE_FAILED",
        )
