import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_citizen_registration_cannot_elevate_privileges(client: AsyncClient):
    """Test that public registration always assigns Role.CITIZEN and cannot elevate to ADMIN/OFFICER."""
    payload = {
        "email": "newcitizen@example.com",
        "password": "StrongPassword123!",
        "full_name": "Test Citizen User",
        "phone_number": "+1234567890",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["token_type"] == "bearer"
    assert "access_token" in data
    assert data["user"]["role"] == "CITIZEN"
    assert data["user"]["department_id"] is None


@pytest.mark.asyncio
async def test_duplicate_registration_rejected(client: AsyncClient):
    """Test that duplicate registration email returns 409 Conflict."""
    payload = {
        "email": "duplicate@example.com",
        "password": "StrongPassword123!",
        "full_name": "Test User",
    }
    res1 = await client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = await client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 409
    assert res2.json()["error_code"] == "CONFLICT"


@pytest.mark.asyncio
async def test_user_login_success_and_failure(client: AsyncClient):
    """Test login with valid and invalid credentials."""
    # Test seeded citizen login
    valid_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "citizen@smartcity.gov", "password": "Citizen@SmartCity2026!"},
    )
    assert valid_res.status_code == 200
    assert "access_token" in valid_res.json()
    assert valid_res.json()["user"]["email"] == "citizen@smartcity.gov"

    # Test invalid password
    invalid_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "citizen@smartcity.gov", "password": "WrongPassword!"},
    )
    assert invalid_res.status_code == 401


@pytest.mark.asyncio
async def test_get_current_profile(client: AsyncClient):
    """Test /auth/me returns current authenticated user profile."""
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@smartcity.gov", "password": "Admin@SmartCity2026!"},
    )
    token = login_res.json()["access_token"]

    me_res = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "admin@smartcity.gov"
    assert me_res.json()["role"] == "ADMIN"


@pytest.mark.asyncio
async def test_invalid_and_expired_tokens_rejected(client: AsyncClient):
    """Test that missing, malformed, invalid-signature, and expired tokens return HTTP 401."""
    # 1. Missing token
    res1 = await client.get("/api/v1/auth/me")
    assert res1.status_code == 401
    assert "token required" in res1.json()["message"].lower()

    # 2. Malformed token string
    res2 = await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not-a-valid-jwt"})
    assert res2.status_code == 401

    # 3. Fabricated token with forged signature
    fake_token = (
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
        "eyJzdWIiOiJmYWtlLXVzZXItaWQiLCJlbWFpbCI6ImhhY2tlckBldmlsLmNvbSJ9."
        "forged_invalid_signature_bytes_here"
    )
    res3 = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {fake_token}"})
    assert res3.status_code == 401

    # 4. Expired token
    from datetime import datetime, timedelta, timezone
    import jwt
    from app.config import settings
    expired_payload = {
        "sub": "some-user-id",
        "exp": int((datetime.now(timezone.utc) - timedelta(hours=1)).timestamp()),
    }
    expired_token = jwt.encode(expired_payload, settings.SECRET_KEY, algorithm="HS256")
    res4 = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert res4.status_code == 401


@pytest.mark.asyncio
async def test_supabase_token_claims_cannot_elevate_server_role(client: AsyncClient):
    """Verify that claims submitted in a client token cannot grant elevated privileges."""
    from datetime import datetime, timedelta, timezone
    import jwt
    from app.config import settings

    # Attempt to forge an ADMIN claim inside a citizen's token
    citizen_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "citizen@smartcity.gov", "password": "Citizen@SmartCity2026!"},
    )
    citizen_id = citizen_login.json()["user"]["id"]

    forged_claims = {
        "sub": citizen_id,
        "role": "ADMIN",  # Attempted privilege escalation claim
        "exp": int((datetime.now(timezone.utc) + timedelta(hours=1)).timestamp()),
    }
    forged_token = jwt.encode(forged_claims, settings.SECRET_KEY, algorithm="HS256")

    # Access admin endpoint with citizen account carrying forged claim
    admin_res = await client.get(
        "/api/v1/admin/analytics",
        headers={"Authorization": f"Bearer {forged_token}"},
    )
    # Server must look up user's real role from the database and reject with 403 Forbidden
    assert admin_res.status_code == 403


@pytest.mark.asyncio
async def test_supabase_es256_token_verification(client: AsyncClient, monkeypatch):
    """Test full asymmetric ES256 Supabase token validation and user profile synchronization."""
    from datetime import datetime, timedelta, timezone
    from unittest.mock import MagicMock
    from cryptography.hazmat.primitives.asymmetric import ec
    import jwt
    from app.config import settings
    from app.core import security

    # Generate ephemeral P-256 private/public key pair
    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()

    # Create mock PyJWK
    mock_jwk = MagicMock()
    mock_jwk.key = public_key
    mock_jwks_client = MagicMock()
    mock_jwks_client.get_signing_key_from_jwt.return_value = mock_jwk

    monkeypatch.setattr(security, "get_jwks_client", lambda: mock_jwks_client)

    now = datetime.now(timezone.utc)
    token_payload = {
        "iss": f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1",
        "sub": "supabase-test-citizen-uid-12345",
        "aud": "authenticated",
        "exp": int((now + timedelta(hours=1)).timestamp()),
        "email": "supabase.citizen@example.gov",
        "user_metadata": {"full_name": "Supabase Citizen Test"},
    }
    supabase_token = jwt.encode(
        token_payload,
        private_key,
        algorithm="ES256",
        headers={"kid": "mock-supabase-key-id"},
    )

    # Call /api/v1/auth/me with the ES256 token
    res = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {supabase_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "supabase.citizen@example.gov"
    assert data["role"] == "CITIZEN"
    assert data["full_name"] == "Supabase Citizen Test"
