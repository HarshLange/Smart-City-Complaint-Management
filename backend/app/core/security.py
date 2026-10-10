import logging
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
import bcrypt
import jwt
from app.config import settings

logger = logging.getLogger(__name__)

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


_jwks_client: Optional[jwt.PyJWKClient] = None
_supabase_client = None


def get_jwks_client() -> Optional[jwt.PyJWKClient]:
    """Lazy initialize PyJWKClient for Supabase JWKS key resolution with caching."""
    global _jwks_client
    if _jwks_client is None and settings.SUPABASE_URL:
        jwks_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
        _jwks_client = jwt.PyJWKClient(jwks_url, cache_keys=True, max_cached_keys=16)
    return _jwks_client


def get_supabase_client():
    """Lazy initialize Supabase client for live fallback token verification."""
    global _supabase_client
    if _supabase_client is None and settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            import supabase
            _supabase_client = supabase.create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        except Exception as e:
            logger.warning("Failed to initialize Supabase client for auth fallback: %s", e)
    return _supabase_client


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate signed JWT access token.
    
    Supports:
    1. Supabase-issued asymmetric JWTs (ES256, RS256) verified via live JWKS.
    2. Supabase-issued symmetric JWTs (HS256) verified via settings.SUPABASE_JWT_SECRET if configured.
    3. Live fallback verification via Supabase Auth API if JWKS/signature resolution fails.
    4. Locally-issued symmetric JWTs (HS256) verified via settings.SECRET_KEY.
    """
    if not token or not isinstance(token, str):
        return None

    # Determine token header metadata
    alg = None
    kid = None
    try:
        unverified_header = jwt.get_unverified_header(token)
        alg = unverified_header.get("alg")
        kid = unverified_header.get("kid")
    except Exception:
        pass

    # 1. Supabase verification
    if settings.SUPABASE_URL:
        base_supabase = settings.SUPABASE_URL.rstrip("/")
        valid_issuers = [f"{base_supabase}/auth/v1", base_supabase]

        # 1a. Asymmetric ES256 / RS256 verification via JWKS
        if kid or alg in ("ES256", "RS256"):
            try:
                client = get_jwks_client()
                if client:
                    signing_key = client.get_signing_key_from_jwt(token)
                    payload = jwt.decode(
                        token,
                        signing_key.key,
                        algorithms=["ES256", "RS256"],
                        audience="authenticated",
                        issuer=valid_issuers,
                    )
                    return payload
            except jwt.PyJWTError as e:
                logger.warning("JWKS verification failed for Supabase token: %s", e)
            except Exception as e:
                logger.warning("Unexpected error during JWKS resolution: %s", e)

        # 1b. Symmetric HS256 verification via SUPABASE_JWT_SECRET
        supabase_jwt_secret = getattr(settings, "SUPABASE_JWT_SECRET", "")
        if supabase_jwt_secret and alg == "HS256":
            try:
                payload = jwt.decode(
                    token,
                    supabase_jwt_secret,
                    algorithms=["HS256"],
                    audience="authenticated",
                    issuer=valid_issuers,
                )
                return payload
            except jwt.PyJWTError:
                pass

        # 1c. Authoritative Supabase Auth API fallback
        # If the token is from Supabase (kid present, ES256/RS256, or claims Supabase origin)
        if (kid or alg in ("ES256", "RS256")) and settings.SUPABASE_KEY:
            try:
                sb_client = get_supabase_client()
                if sb_client:
                    user_res = sb_client.auth.get_user(token)
                    if user_res and user_res.user:
                        sb_u = user_res.user
                        return {
                            "sub": str(sb_u.id),
                            "email": sb_u.email,
                            "user_metadata": sb_u.user_metadata or {},
                            "app_metadata": sb_u.app_metadata or {},
                            "aud": getattr(sb_u, "aud", "authenticated") or "authenticated",
                            "role": getattr(sb_u, "role", "authenticated") or "authenticated",
                        }
            except Exception as e:
                logger.warning("Supabase live auth verification fallback failed: %s", e)

    # 2. Locally signed HS256 token verification
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
