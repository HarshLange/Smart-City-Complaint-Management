import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
import bcrypt
import jwt
from app.config import settings

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    """Hash plaintext password using bcrypt with 12 salt rounds."""
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plaintext password against bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


def create_access_token(
    subject: str,
    claims: Optional[Dict[str, Any]] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create signed JWT access token."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode: Dict[str, Any] = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    if claims:
        to_encode.update(claims)

    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate signed JWT access token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None


def generate_complaint_reference() -> str:
    """Generate high-entropy human-readable public reference: e.g. REF-20261010-8A4F2C"""
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    random_part = "".join(secrets.choice("ABCDEFGHJKLMNPQRSTUVWXYZ23456789") for _ in range(6))
    return f"REF-{date_str}-{random_part}"


def generate_tracking_pin() -> str:
    """Generate secure high-entropy 6-character alphanumeric tracking PIN."""
    chars = string.ascii_uppercase + string.digits
    # Exclude ambiguous characters
    safe_chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
    return "".join(secrets.choice(safe_chars) for _ in range(6))


def hash_tracking_pin(pin: str) -> str:
    """Hash tracking PIN using bcrypt for secure storage."""
    return hash_password(pin.strip().upper())


def verify_tracking_pin(plain_pin: str, hashed_pin: str) -> bool:
    """Verify tracking PIN case-insensitively."""
    return verify_password(plain_pin.strip().upper(), hashed_pin)
