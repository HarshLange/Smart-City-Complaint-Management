import io
from PIL import Image
import pytest
from httpx import AsyncClient


def make_test_image() -> bytes:
    img = Image.new("RGB", (250, 250), color=(120, 180, 220))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.mark.asyncio
async def test_complaint_submission_and_tracking(client: AsyncClient):
    """Test full submission pipeline: image validation, AI inference, and public tracking."""
    # 1. Login citizen
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "citizen@smartcity.gov", "password": "Citizen@SmartCity2026!"},
    )
    token = login_res.json()["access_token"]

    # 2. Submit complaint
    img_bytes = make_test_image()
    files = {"file": ("pothole.jpg", img_bytes, "image/jpeg")}
    form_data = {
        "title": "Severe road pothole on Main Avenue",
        "description": "Deep pothole causing vehicular damage near Central Plaza junction.",
        "latitude": "40.7128",
        "longitude": "-74.0060",
        "address": "123 Main Avenue, Central District",
        "landmark": "Opposite City Bank",
    }

    res = await client.post(
        "/api/v1/complaints/",
        data=form_data,
        files=files,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    created = res.json()
    ref_num = created["reference_number"]
    tracking_pin = created["tracking_pin"]

    assert ref_num.startswith("REF-")
    assert len(tracking_pin) == 6
    assert created["status"] in ["ASSIGNED", "UNDER_REVIEW"]

    # 3. Public tracking with correct reference and PIN
    track_res = await client.post(
        "/api/v1/complaints/track",
        json={"reference_number": ref_num, "tracking_pin": tracking_pin},
    )
    assert track_res.status_code == 200
    track_data = track_res.json()
    assert track_data["reference_number"] == ref_num
    assert track_data["title"] == "Severe road pothole on Main Avenue"

    # PRIVACY VERIFICATION: Must NOT disclose citizen personal information or internal notes
    assert "citizen_name" not in track_data
    assert "citizen_email" not in track_data
    assert "phone_number" not in track_data
    assert "officer_notes" not in track_data
    assert "storage_path" not in track_data

    # 4. Public tracking with incorrect PIN rejected
    bad_track = await client.post(
        "/api/v1/complaints/track",
        json={"reference_number": ref_num, "tracking_pin": "WRONG1"},
    )
    assert bad_track.status_code == 401


@pytest.mark.asyncio
async def test_citizen_complaint_ownership_isolation(client: AsyncClient):
    """Test that Citizen A cannot view or list Citizen B's private complaints."""
    # Register Citizen B
    await client.post(
        "/api/v1/auth/register",
        json={"email": "citizen_b@example.com", "password": "Password123!", "full_name": "Citizen B"},
    )
    login_b = await client.post(
        "/api/v1/auth/login",
        json={"email": "citizen_b@example.com", "password": "Password123!"},
    )
    token_b = login_b.json()["access_token"]

    # Citizen B creates a complaint
    img_bytes = make_test_image()
    res_b = await client.post(
        "/api/v1/complaints/",
        data={"title": "Citizen B complaint", "description": "Private issue description"},
        files={"file": ("img.jpg", img_bytes, "image/jpeg")},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    complaint_b_id = res_b.json()["id"]

    # Login Citizen A (Jane Doe)
    login_a = await client.post(
        "/api/v1/auth/login",
        json={"email": "citizen@smartcity.gov", "password": "Citizen@SmartCity2026!"},
    )
    token_a = login_a.json()["access_token"]

    # Citizen A attempts to access Citizen B's complaint detail -> Forbidden 403
    forbidden_res = await client.get(
        f"/api/v1/complaints/{complaint_b_id}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert forbidden_res.status_code == 403

    # Citizen A lists /complaints/mine -> must NOT include Citizen B's complaint
    mine_res = await client.get(
        "/api/v1/complaints/mine",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert mine_res.status_code == 200
    ids = [c["id"] for c in mine_res.json()]
    assert complaint_b_id not in ids
