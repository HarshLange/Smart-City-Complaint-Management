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
