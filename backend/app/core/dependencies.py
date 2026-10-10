from typing import Optional
from fastapi import Cookie, Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
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

    user_id = payload["sub"]
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

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

    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
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
