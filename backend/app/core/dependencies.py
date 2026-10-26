from typing import Optional
from fastapi import Cookie, Depends, Header
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User


async def get_current_user(
    authorization: Optional[str] = Header(None),
    access_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract and validate the authenticated user from Bearer header or HTTP cookie."""
    token: Optional[str] = None

    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
    elif access_token:
        token = access_token

    if not token:
        raise UnauthorizedException("Authentication token required")

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise UnauthorizedException("Invalid, expired, or malformed authentication token")

    user_id = str(payload["sub"])
    result = await db.execute(
        select(User).options(selectinload(User.department)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    # Safely extract email from top-level claims or user_metadata
    email = (
        payload.get("email")
        or (payload.get("user_metadata") or {}).get("email")
        or ""
    ).strip().lower()

    # If user not found by ID, attempt lookup by email (e.g. pre-existing email account)
    if not user and email:
        res_email = await db.execute(
            select(User).options(selectinload(User.department)).where(User.email == email)
        )
        user = res_email.scalar_one_or_none()

    # If user is authenticated via Supabase but profile row doesn't exist, auto-provision Citizen profile
    aud = payload.get("aud")
    is_authenticated = (
        aud == "authenticated"
        or (isinstance(aud, list) and "authenticated" in aud)
        or payload.get("role") == "authenticated"
    )
    if not user and is_authenticated and email:
        user_metadata = payload.get("user_metadata") or {}
        full_name = (
            user_metadata.get("full_name")
            or user_metadata.get("name")
            or email.split("@")[0]
        ).strip()
        user = User(
            id=user_id,
            email=email,
            hashed_password="[SUPABASE_MANAGED_AUTH]",
            full_name=full_name,
            role=UserRole.CITIZEN,  # Invariant: external OAuth sign-in is strictly CITIZEN
            department_id=None,
            is_active=True,
        )
        try:
            db.add(user)
            await db.commit()
            await db.refresh(user)
        except IntegrityError:
            await db.rollback()
            # Handle concurrent registration or unique constraint conflict safely
            res_conflict = await db.execute(
                select(User).where((User.id == user_id) | (User.email == email))
            )
            user = res_conflict.scalar_one_or_none()
            if not user:
                raise

    if not user:
        raise UnauthorizedException("User account does not exist")
    if not user.is_active:
        raise ForbiddenException("User account has been deactivated")

    return user


async def get_optional_user(
    authorization: Optional[str] = Header(None),
    access_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Retrieve user if valid token present, otherwise return None."""
    token: Optional[str] = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
    elif access_token:
        token = access_token

    if not token:
        return None

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        return None

    user_id = str(payload["sub"])
    result = await db.execute(
        select(User).options(selectinload(User.department)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    email = (
        payload.get("email")
        or (payload.get("user_metadata") or {}).get("email")
        or ""
    ).strip().lower()

    if not user and email:
        res_email = await db.execute(
            select(User).options(selectinload(User.department)).where(User.email == email)
        )
        user = res_email.scalar_one_or_none()

    aud = payload.get("aud")
    is_authenticated = (
        aud == "authenticated"
        or (isinstance(aud, list) and "authenticated" in aud)
        or payload.get("role") == "authenticated"
    )
    if not user and is_authenticated and email:
        user_metadata = payload.get("user_metadata") or {}
        full_name = (
            user_metadata.get("full_name")
            or user_metadata.get("name")
            or email.split("@")[0]
        ).strip()
        user = User(
            id=user_id,
            email=email,
            hashed_password="[SUPABASE_MANAGED_AUTH]",
            full_name=full_name,
            role=UserRole.CITIZEN,
            department_id=None,
            is_active=True,
        )
        try:
            db.add(user)
            await db.commit()
            await db.refresh(user)
        except IntegrityError:
            await db.rollback()
            res_conflict = await db.execute(
                select(User).where((User.id == user_id) | (User.email == email))
            )
            user = res_conflict.scalar_one_or_none()

    return user if user and user.is_active else None


def require_role(*allowed_roles: UserRole):
    """Enforce role-based access control (RBAC). Admin always has access."""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role == UserRole.ADMIN:
            return current_user
        if current_user.role in allowed_roles:
            return current_user
        raise ForbiddenException(
            f"Access restricted to roles: {[r.value for r in allowed_roles]}"
        )
    return role_checker


# Shortcuts
require_citizen = require_role(UserRole.CITIZEN)
require_officer = require_role(UserRole.OFFICER)
require_admin = require_role(UserRole.ADMIN)
