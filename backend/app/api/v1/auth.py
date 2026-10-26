from typing import Optional
from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.config import settings
from app.core.dependencies import get_current_user, get_db
from app.core.exceptions import (
    BadRequestException,
    ConflictException,
    UnauthorizedException,
)
from app.core.rate_limiter import get_client_ip, login_rate_limiter
from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.models.enums import UserRole
from app.models.user import Department, User
from app.schemas.auth import (
    PasswordChangeRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


def user_to_response(user: User) -> UserResponse:
    dept_name = None
    if "department" in user.__dict__ and user.department:
        dept_name = user.department.name
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        phone_number=user.phone_number,
        role=user.role,
        department_id=user.department_id,
        department_name=dept_name,
        is_active=user.is_active,
        created_at=user.created_at,
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_citizen(
    data: UserRegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Register a new citizen account. Role is strictly hardcoded to CITIZEN."""
    # Check duplicate email
    existing = await db.execute(select(User).where(User.email == data.email.lower()))
    if existing.scalar_one_or_none():
        raise ConflictException("An account with this email address already exists.")

    new_user = User(
        email=data.email.lower(),
        hashed_password=hash_password(data.password),
        full_name=data.full_name.strip(),
        phone_number=data.phone_number.strip() if data.phone_number else None,
        role=UserRole.CITIZEN,  # Invariant: Public registration never grants elevated privileges
        department_id=None,
        is_active=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    token = create_access_token(
        subject=new_user.id,
        claims={"role": new_user.role.value, "email": new_user.email},
    )

    # Set secure HTTP-only cookie
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=user_to_response(new_user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    data: UserLoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate citizen, officer, or administrator with rate limiting and secure session token."""
    client_ip = get_client_ip(request)
    login_rate_limiter.check(client_ip)

    result = await db.execute(
        select(User).options(selectinload(User.department)).where(User.email == data.email.lower())
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        raise UnauthorizedException("Invalid email address or password")

    if not user.is_active:
        raise UnauthorizedException("This account has been deactivated. Contact administration.")

    token = create_access_token(
        subject=user.id,
        claims={
            "role": user.role.value,
            "dept_id": user.department_id,
            "email": user.email,
        },
    )

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=user_to_response(user),
    )


@router.post("/logout")
async def logout(response: Response):
    """Clear session cookie on logout."""
    response.delete_cookie(key="access_token")
    return {"message": "Successfully signed out"}


@router.get("/me", response_model=UserResponse)
async def get_current_profile(current_user: User = Depends(get_current_user)):
    """Fetch profile of currently authenticated user."""
    return user_to_response(current_user)


@router.post("/change-password")
async def change_password(
    data: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change password verifying the current password first."""
    if not verify_password(data.current_password, current_user.hashed_password):
        raise BadRequestException("Current password does not match", error_code="INVALID_CURRENT_PASSWORD")

    current_user.hashed_password = hash_password(data.new_password)
    await db.commit()
    return {"message": "Password changed successfully"}
