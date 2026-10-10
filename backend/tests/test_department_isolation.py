import io
from PIL import Image
import pytest
from httpx import AsyncClient


def make_test_image() -> bytes:
    img = Image.new("RGB", (200, 200), color=(80, 160, 240))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.mark.asyncio
async def test_cross_department_access_prevention(client: AsyncClient):
    """Test that a Water Department officer cannot access or modify a Road Authority complaint."""
    # 1. Login Water Officer
    water_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "officer.water@smartcity.gov", "password": "Officer@SmartCity2026!"},
    )
    water_token = water_login.json()["access_token"]

    # 2. Login Road Officer
    road_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "officer.road@smartcity.gov", "password": "Officer@SmartCity2026!"},
    )
    road_token = road_login.json()["access_token"]
    road_dept_id = road_login.json()["user"]["department_id"]

    # 3. Create a complaint explicitly assigned to Road Authority
    # Use Admin to ensure it is in Road Authority
    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@smartcity.gov", "password": "Admin@SmartCity2026!"},
    )
    admin_token = admin_login.json()["access_token"]

    submit_res = await client.post(
        "/api/v1/complaints/",
        data={"title": "Damaged asphalt surface", "description": "Large road crater on Highway 9"},
        files={"file": ("road.jpg", make_test_image(), "image/jpeg")},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    complaint_id = submit_res.json()["id"]

    # Override to Road Authority to guarantee assignment
    await client.post(
        f"/api/v1/admin/complaints/{complaint_id}/override",
        json={"category": "damaged_road", "department_id": road_dept_id, "override_reason": "Verified road damage"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    # 4. Water Officer attempts to read complaint detail -> 403 Forbidden
    water_read = await client.get(
        f"/api/v1/complaints/{complaint_id}",
        headers={"Authorization": f"Bearer {water_token}"},
    )
    assert water_read.status_code == 403

    # 5. Water Officer attempts to update status -> 403 Forbidden
    water_update = await client.patch(
        f"/api/v1/department/complaints/{complaint_id}/status",
        json={"new_status": "IN_PROGRESS", "notes": "Unauthorized modification attempt"},
        headers={"Authorization": f"Bearer {water_token}"},
    )
    assert water_update.status_code == 403

    # 6. Road Officer CAN read and update status
    road_read = await client.get(
        f"/api/v1/complaints/{complaint_id}",
        headers={"Authorization": f"Bearer {road_token}"},
    )
    assert road_read.status_code == 200

    road_update = await client.patch(
        f"/api/v1/department/complaints/{complaint_id}/status",
        json={"new_status": "IN_PROGRESS", "notes": "Road crew dispatched to Highway 9."},
        headers={"Authorization": f"Bearer {road_token}"},
    )
    assert road_update.status_code == 200
    assert road_update.json()["status"] == "IN_PROGRESS"


@pytest.mark.asyncio
async def test_invalid_status_transition_rejected(client: AsyncClient):
    """Test that invalid state transitions (e.g., ASSIGNED directly to CLOSED) are rejected."""
    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@smartcity.gov", "password": "Admin@SmartCity2026!"},
    )
    token = admin_login.json()["access_token"]

    submit_res = await client.post(
        "/api/v1/complaints/",
        data={"title": "Test invalid transitions", "description": "Testing state machine rejection"},
        files={"file": ("img.jpg", make_test_image(), "image/jpeg")},
        headers={"Authorization": f"Bearer {token}"},
    )
    complaint_id = submit_res.json()["id"]

    # Attempt illegal transition: cannot jump from current state to CLOSED directly if not in UNDER_REVIEW/RESOLVED
    # Current status is ASSIGNED or UNDER_REVIEW. If ASSIGNED, target CLOSED is illegal.
    illegal_res = await client.patch(
        f"/api/v1/department/complaints/{complaint_id}/status",
        json={"new_status": "REOPENED", "notes": "Premature reopening"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert illegal_res.status_code == 400
    assert illegal_res.json()["error_code"] == "INVALID_STATE_TRANSITION"
