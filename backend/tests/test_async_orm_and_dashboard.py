from datetime import datetime, timezone
import io
from unittest.mock import patch
from PIL import Image
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.v1.complaints import complaint_to_detail_response
from app.models.complaint import Complaint
from app.models.enums import CivicCategory, ComplaintStatus


def make_test_image() -> bytes:
    img = Image.new("RGB", (250, 250), color=(100, 150, 200))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.mark.asyncio
async def test_get_my_complaints_eager_loading_and_no_missing_greenlet(client: AsyncClient):
    """Verify GET /api/v1/complaints/mine eagerly loads all 7 relationships without MissingGreenlet."""
    # 1. Login existing seeded citizen
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "citizen@smartcity.gov", "password": "Citizen@SmartCity2026!"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}

    # 2. Submit a complaint to ensure at least one complaint exists
    files = {"file": ("pothole.jpg", make_test_image(), "image/jpeg")}
    form_data = {
        "title": "Severe road pothole on 4th Street",
        "description": "Deep depression on the pavement causing vehicles to swerve into oncoming traffic.",
        "latitude": "40.7128",
        "longitude": "-74.0060",
        "address": "400 4th Street",
    }
    submit_res = await client.post(
        "/api/v1/complaints/",
        data=form_data,
        files=files,
        headers=auth_headers,
    )
    assert submit_res.status_code == 201

    # 3. Request citizen's complaints list
    mine_res = await client.get("/api/v1/complaints/mine", headers=auth_headers)
    assert mine_res.status_code == 200
    complaints = mine_res.json()
    assert isinstance(complaints, list)
    assert len(complaints) >= 1

    first = complaints[0]
    assert "reference_number" in first
    assert "citizen_name" in first
    assert first["citizen_name"] == "Jane Doe (Verified Citizen)"
    assert "department_name" in first
    assert "attachments" in first
    assert "status_history" in first
    assert "ai_prediction" in first
    assert first["ai_prediction"] is not None


@pytest.mark.asyncio
async def test_get_my_complaints_empty_list_for_new_citizen(client: AsyncClient):
    """Verify a newly registered citizen receives an empty list with 200 OK without errors."""
    reg_res = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "new_resident@smartcity.gov",
            "password": "ResidentSecure2026!",
            "full_name": "New Resident",
            "phone_number": "+1234567890",
        },
    )
    assert reg_res.status_code == 201
    token = reg_res.json()["access_token"]

    mine_res = await client.get(
        "/api/v1/complaints/mine",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert mine_res.status_code == 200
    assert mine_res.json() == []


@pytest.mark.asyncio
async def test_complaint_to_detail_response_defensive_against_unloaded_relationships():
    """Verify complaint_to_detail_response safely inspects __dict__ and never triggers lazy I/O on unloaded attributes."""
    now = datetime.now(timezone.utc)
    # Create detached Complaint with NO relationships in __dict__
    detached = Complaint(
        id="mock-complaint-id-1234",
        reference_number="REF-TEST-001",
        title="Detached Complaint Test",
        description="Testing defensive relationship handling without active session or loaded relationships.",
        category=CivicCategory.POTHOLE,
        status=ComplaintStatus.SUBMITTED,
        priority="NORMAL",
        user_id="mock-user-123",
        department_id="mock-dept-456",
        created_at=now,
        updated_at=now,
    )

    # Calling complaint_to_detail_response must not raise MissingGreenlet or AttributeError
    response = complaint_to_detail_response(detached, show_internal_notes=True)
    assert response.id == "mock-complaint-id-1234"
    assert response.reference_number == "REF-TEST-001"
    assert response.citizen_name == "Anonymous Citizen"
    assert response.department_name is None
    assert response.assigned_officer_name is None
    assert response.ai_prediction is None
    assert response.attachments == []
    assert response.status_history == []
    assert response.officer_notes == []


@pytest.mark.asyncio
async def test_health_check_healthy_with_database_probe(client: AsyncClient):
    """Verify /health and /api/v1/health probe database connectivity and report healthy."""
    for path in ["/health", "/api/v1/health"]:
        res = await client.get(path)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"
        assert data["multimodal_fusion_enabled"] is True


@pytest.mark.asyncio
async def test_health_check_degraded_when_database_fails(client: AsyncClient):
    """Verify /health returns 503 Service Unavailable when the database probe fails."""
    class FailingSessionContext:
        async def __aenter__(self):
            raise ConnectionRefusedError("Simulated PostgreSQL connection timeout")

        async def __aexit__(self, exc_type, exc_val, exc_tb):
            pass

    with patch("app.main.AsyncSessionLocal", return_value=FailingSessionContext()):
        res = await client.get("/health")
        assert res.status_code == 503
        data = res.json()
        assert data["status"] == "degraded"
        assert data["database"] == "unavailable"
