import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_citizen_cannot_access_admin_endpoints(client: AsyncClient):
    """Test that citizens cannot access administrator endpoints."""
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "citizen@smartcity.gov", "password": "Citizen@SmartCity2026!"},
    )
    token = login_res.json()["access_token"]

    res = await client.get(
        "/api/v1/admin/analytics",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403

    prov_res = await client.post(
        "/api/v1/admin/provision-officer",
        json={
            "email": "rogue@smartcity.gov",
            "password": "Password123!",
            "full_name": "Rogue Officer",
            "department_id": "none",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert prov_res.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_provision_officer_and_view_analytics(client: AsyncClient):
    """Test administrator provisioning a new officer and viewing real analytics."""
    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@smartcity.gov", "password": "Admin@SmartCity2026!"},
    )
    admin_token = admin_login.json()["access_token"]

    # Get departments to fetch ID
    depts_res = await client.get("/api/v1/department/departments")
    dept_id = depts_res.json()[0]["id"]

    # Provision officer
    prov_res = await client.post(
        "/api/v1/admin/provision-officer",
        json={
            "email": "new.officer@smartcity.gov",
            "password": "OfficerPass123!",
            "full_name": "Newly Recruited Officer",
            "department_id": dept_id,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert prov_res.status_code == 201
    assert prov_res.json()["role"] == "OFFICER"
    assert prov_res.json()["department_id"] == dept_id

    # View analytics
    analytics_res = await client.get(
        "/api/v1/admin/analytics",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert analytics_res.status_code == 200
    analytics = analytics_res.json()
    assert analytics["total_users"] >= 5
    assert len(analytics["department_workloads"]) >= 4


@pytest.mark.asyncio
async def test_upload_validation_rejects_non_image_payloads(client: AsyncClient):
    """Test that text files or fake images are rejected by Pillow verification."""
    fake_file = b"This is a text file pretending to be an image."
    files = {"file": ("malicious.jpg", fake_file, "image/jpeg")}

    res = await client.post(
        "/api/v1/complaints/",
        data={"title": "Attack attempt", "description": "Fake file upload payload"},
        files=files,
    )
    assert res.status_code == 400
    assert res.json()["error_code"] in ["INVALID_IMAGE_BYTES", "INVALID_IMAGE_FORMAT", "FILE_CORRUPT"]


@pytest.mark.asyncio
async def test_path_traversal_protection(client: AsyncClient):
    """Test that path traversal sequences in file download requests are rejected."""
    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@smartcity.gov", "password": "Admin@SmartCity2026!"},
    )
    admin_token = admin_login.json()["access_token"]

    res = await client.get(
        "/api/v1/files/download?path=../../etc/passwd",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 400
    assert res.json()["error_code"] == "PATH_TRAVERSAL_DETECTED"
