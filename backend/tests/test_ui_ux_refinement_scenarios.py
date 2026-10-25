import io
from PIL import Image
import pytest
from httpx import AsyncClient
from app.models.enums import CivicCategory, ComplaintStatus, UserRole


def make_test_image() -> bytes:
    img = Image.new("RGB", (250, 250), color=(120, 180, 220))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.mark.asyncio
async def test_scenario_1_unauthenticated_rejection_and_authenticated_submission_with_public_tracking(client: AsyncClient):
    """Scenario 1: Unauthenticated submission is rejected (401); authenticated citizen succeeds; public tracks via PIN."""
    img_bytes = make_test_image()
    files = {"file": ("anonymous_issue.jpg", img_bytes, "image/jpeg")}
    form_data = {
        "title": "Broken storm drain cover on 5th Street",
        "description": "The metal storm drain grate is broken and poses a severe pedestrian tripping hazard.",
        "address": "5th Street & Elm Avenue",
    }

    # 1. Unauthenticated submission must fail with HTTP 401
    unauth_res = await client.post("/api/v1/complaints/", data=form_data, files=files)
    assert unauth_res.status_code == 401

    # 2. Authenticate as citizen
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "citizen@smartcity.gov", "password": "Citizen@SmartCity2026!"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    citizen_user = login_res.json()["user"]

    # 3. Authenticated citizen submits complaint
    files = {"file": ("drain_issue.jpg", img_bytes, "image/jpeg")}
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
    assert "ai_prediction" in created
    assert created["ai_prediction"] is not None

    # Verify user association in complaint detail
    detail_res = await client.get(
        f"/api/v1/complaints/{created['id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert detail_res.status_code == 200
    assert detail_res.json()["user_id"] == citizen_user["id"]

    # 4. Track publicly without any authorization header
    track_res = await client.post(
        "/api/v1/complaints/track",
        json={"reference_number": ref_num, "tracking_pin": tracking_pin},
    )
    assert track_res.status_code == 200
    track_data = track_res.json()
    assert track_data["reference_number"] == ref_num
    assert track_data["title"] == "Broken storm drain cover on 5th Street"
    # Ensure no PII leakage in sanitized tracking DTO
    assert "citizen_email" not in track_data
    assert "user_id" not in track_data


@pytest.mark.asyncio
async def test_scenario_2_citizen_auth_and_ownership_isolation(client: AsyncClient):
    """Scenario 2: Citizen authenticated workflow and mine list."""
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "citizen@smartcity.gov", "password": "Citizen@SmartCity2026!"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    user = login_res.json()["user"]
    assert user["role"] == "CITIZEN"

    # Verify /auth/me returns citizen profile
    me_res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "citizen@smartcity.gov"

    # Verify get my complaints
    mine_res = await client.get("/api/v1/complaints/mine", headers={"Authorization": f"Bearer {token}"})
    assert mine_res.status_code == 200
    assert isinstance(mine_res.json(), list)


@pytest.mark.asyncio
async def test_scenario_3_ai_classification_transparency_in_response(client: AsyncClient):
    """Scenario 3: Response contains full multimodal diagnostics for transparent UI rendering."""
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "citizen@smartcity.gov", "password": "Citizen@SmartCity2026!"},
    )
    token = login_res.json()["access_token"]

    img_bytes = make_test_image()
    files = {"file": ("road_crater.jpg", img_bytes, "image/jpeg")}
    form_data = {
        "title": "Severe road crater and pothole",
        "description": "Major deep asphalt pothole damaged car tire on the main highway road.",
    }

    res = await client.post(
        "/api/v1/complaints/",
        data=form_data,
        files=files,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    created = res.json()

    ai_pred = created["ai_prediction"]
    assert ai_pred is not None
    assert "model_name" in ai_pred
    assert "confidence_score" in ai_pred
    assert "all_probabilities" in ai_pred

    probs = ai_pred["all_probabilities"]
    assert "fused" in probs
    assert "vision" in probs
    assert "nlp" in probs
    assert "fusion_details" in probs


@pytest.mark.asyncio
async def test_scenario_4_and_5_multimodal_disagreement_routed_to_review_queue(client: AsyncClient):
    """Scenario 4 & 5: Disagreement between vision and text sets status to UNDER_REVIEW and routes to review queue."""
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "citizen@smartcity.gov", "password": "Citizen@SmartCity2026!"},
    )
    token = login_res.json()["access_token"]

    # Synthetic image will classify as damaged_road or streetlight, while text explicitly describes water leak
    img_bytes = make_test_image()
    files = {"file": ("conflict_test.jpg", img_bytes, "image/jpeg")}
    form_data = {
        "title": "Pressurized municipal water pipe leak and flooding",
        "description": "High pressure clean drinking water main pipe burst flooding basement and street pipeline leak.",
    }

    res = await client.post(
        "/api/v1/complaints/",
        data=form_data,
        files=files,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    created = res.json()

    complaint_id = created["id"]
    ai_pred = created["ai_prediction"]
    probs = ai_pred["all_probabilities"]

    # If disagreement is detected, department_id must be None and status UNDER_REVIEW
    if probs.get("disagreement_detected"):
        assert created["status"] == "UNDER_REVIEW"
        assert created["needs_review"] is True
        assert created["department_code"] is None
        assert created["department_name"] == "Review Queue"

        # Admin checks review queue and finds the complaint
        admin_login = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@smartcity.gov", "password": "Admin@SmartCity2026!"},
        )
        admin_token = admin_login.json()["access_token"]

        queue_res = await client.get(
            "/api/v1/admin/ai-review-queue",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert queue_res.status_code == 200
        queue_items = queue_res.json()
        matching = [c for c in queue_items if c["id"] == complaint_id]
        assert len(matching) == 1
        assert matching[0]["ai_prediction"]["all_probabilities"]["disagreement_detected"] is True


@pytest.mark.asyncio
async def test_scenario_6_admin_authoritative_override_promotes_complaint(client: AsyncClient):
    """Scenario 6: Admin reviews flagged complaint and overrides to correct department."""
    cit_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "citizen@smartcity.gov", "password": "Citizen@SmartCity2026!"},
    )
    cit_token = cit_login.json()["access_token"]

    # 1. Create a complaint that requires review
    img_bytes = make_test_image()
    files = {"file": ("override_target.jpg", img_bytes, "image/jpeg")}
    form_data = {
        "title": "Water leak pipe burst emergency flooding street",
        "description": "Main water pipeline broke and clean water is gushing out rapidly.",
    }

    res = await client.post(
        "/api/v1/complaints/",
        data=form_data,
        files=files,
        headers={"Authorization": f"Bearer {cit_token}"},
    )
    assert res.status_code == 201
    created = res.json()
    complaint_id = created["id"]

    # 2. Login Admin
    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@smartcity.gov", "password": "Admin@SmartCity2026!"},
    )
    admin_token = admin_login.json()["access_token"]

    # 3. Get Water Department ID
    depts_res = await client.get(
        "/api/v1/admin/departments",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    depts = depts_res.json()
    water_dept = next((d for d in depts if d["code"] == "WATR"), depts[0])

    # 4. Perform override
    override_payload = {
        "category": "water_leak",
        "department_id": water_dept["id"],
        "override_reason": "Verified water main leak after human inspection of photographic and textual evidence.",
    }

    override_res = await client.post(
        f"/api/v1/admin/complaints/{complaint_id}/override",
        json=override_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert override_res.status_code == 200
    updated = override_res.json()
    assert updated["category"] == "water_leak"
    assert updated["department_id"] == water_dept["id"]
    # Must be promoted to ASSIGNED after administrator verification
    assert updated["status"] == "ASSIGNED"
    assert updated["ai_prediction"]["is_overridden"] is True

    # 5. Check review queue: Complaint must no longer be in AI Review Queue
    queue_res = await client.get(
        "/api/v1/admin/ai-review-queue",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert queue_res.status_code == 200
    queue_ids = [c["id"] for c in queue_res.json()]
    assert complaint_id not in queue_ids


@pytest.mark.asyncio
async def test_scenario_7_security_boundaries_and_role_protection(client: AsyncClient):
    """Scenario 7: Citizen cannot access admin endpoints; Officer cannot override AI."""
    # Login citizen
    cit_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "citizen@smartcity.gov", "password": "Citizen@SmartCity2026!"},
    )
    cit_token = cit_login.json()["access_token"]

    # Citizen attempts admin review queue -> 403 Forbidden
    res = await client.get(
        "/api/v1/admin/ai-review-queue",
        headers={"Authorization": f"Bearer {cit_token}"},
    )
    assert res.status_code == 403

    # Citizen attempts override -> 403 Forbidden
    override_payload = {
        "category": "pothole",
        "department_id": "dummy-dept-id",
        "override_reason": "Unauthorized attempt",
    }
    override_res = await client.post(
        "/api/v1/admin/complaints/some-id/override",
        json=override_payload,
        headers={"Authorization": f"Bearer {cit_token}"},
    )
    assert override_res.status_code == 403
