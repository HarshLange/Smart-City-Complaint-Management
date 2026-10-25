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
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "citizen@smartcity.gov", "password": "Citizen@SmartCity2026!"},
    )
    token = login_res.json()["access_token"]

    fake_file = b"This is a text file pretending to be an image."
    files = {"file": ("malicious.jpg", fake_file, "image/jpeg")}

    res = await client.post(
        "/api/v1/complaints/",
        data={"title": "Attack attempt", "description": "Fake file upload payload"},
        files=files,
        headers={"Authorization": f"Bearer {token}"},
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


@pytest.mark.asyncio
async def test_admin_department_crud(client: AsyncClient):
    """Test administrator can list, create, and update departments."""
    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@smartcity.gov", "password": "Admin@SmartCity2026!"},
    )
    admin_token = admin_login.json()["access_token"]

    # 1. List departments with enriched metadata
    list_res = await client.get(
        "/api/v1/admin/departments",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert list_res.status_code == 200
    departments = list_res.json()
    assert len(departments) >= 4
    first_dept = departments[0]
    assert "active_complaints_count" in first_dept
    assert "officer_count" in first_dept

    # 2. Create department
    create_res = await client.post(
        "/api/v1/admin/departments",
        json={
            "code": "PARKS_DEPT",
            "name": "Parks & Public Spaces Authority",
            "description": "Responsible for city parks, playgrounds, and urban green spaces",
            "contact_email": "parks@smartcity.gov",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert create_res.status_code == 201
    new_dept = create_res.json()
    assert new_dept["name"] == "Parks & Public Spaces Authority"
    assert new_dept["code"] == "PARKS_DEPT"
    new_dept_id = new_dept["id"]

    # 3. Update department
    patch_res = await client.patch(
        f"/api/v1/admin/departments/{new_dept_id}",
        json={
            "description": "Updated mandate for municipal green spaces",
            "contact_email": "greenery@smartcity.gov",
            "is_active": True,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert patch_res.status_code == 200
    updated_dept = patch_res.json()
    assert updated_dept["description"] == "Updated mandate for municipal green spaces"
    assert updated_dept["contact_email"] == "greenery@smartcity.gov"


@pytest.mark.asyncio
async def test_identical_status_transition_rejected(client: AsyncClient):
    """Test that transitioning a complaint to its identical current status is cleanly rejected."""
    import io
    from PIL import Image

    img = Image.new("RGB", (200, 200), color=(80, 160, 240))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    test_img = buf.getvalue()

    # 1. Login Water Officer
    water_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "officer.water@smartcity.gov", "password": "Officer@SmartCity2026!"},
    )
    water_token = water_login.json()["access_token"]
    water_dept_id = water_login.json()["user"]["department_id"]

    # 2. Login Admin and submit a complaint
    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@smartcity.gov", "password": "Admin@SmartCity2026!"},
    )
    admin_token = admin_login.json()["access_token"]

    submit_res = await client.post(
        "/api/v1/complaints/",
        data={"title": "Severe water main burst", "description": "Gallons pouring onto main avenue"},
        files={"file": ("water_leak.jpg", test_img, "image/jpeg")},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert submit_res.status_code == 201
    complaint_id = submit_res.json()["id"]

    # 3. Override to Water Department to route it
    await client.post(
        f"/api/v1/admin/complaints/{complaint_id}/override",
        json={"category": "pothole", "department_id": water_dept_id, "override_reason": "Routing to water"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    # 4. Read complaint as Water Officer
    complaint_res = await client.get(
        f"/api/v1/complaints/{complaint_id}",
        headers={"Authorization": f"Bearer {water_token}"},
    )
    assert complaint_res.status_code == 200
    current_status = complaint_res.json()["status"]

    # 5. Attempt to transition to same current status
    same_transition_res = await client.patch(
        f"/api/v1/department/complaints/{complaint_id}/status",
        json={"new_status": current_status, "notes": "No-op transition"},
        headers={"Authorization": f"Bearer {water_token}"},
    )
    assert same_transition_res.status_code == 400
    assert same_transition_res.json()["error_code"] == "IDENTICAL_STATUS_TRANSITION"

