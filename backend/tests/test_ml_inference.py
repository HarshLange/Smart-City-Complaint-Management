import io
from PIL import Image
import pytest
from app.ml.inference import run_inference_async, run_inference_sync
from app.ml.model import model_manager
from app.ml.routing import resolve_department_code_for_category


def create_test_image_bytes(color=(100, 150, 200), size=(300, 300), format="JPEG") -> bytes:
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()


@pytest.mark.asyncio
async def test_real_model_loaded():
    """Verify real EfficientNetV2-S model is loaded with 5 output classes."""
    model = model_manager.get_model()
    assert model is not None
    assert len(model_manager.class_names) == 5
    assert model_manager.class_names == [
        "damaged_road",
        "garbage",
        "pothole",
        "streetlight_failure",
        "water_leak",
    ]


@pytest.mark.asyncio
async def test_deterministic_department_routing():
    """Verify deterministic category-to-department routing rules."""
    assert resolve_department_code_for_category("damaged_road") == "ROAD_AUTHORITY"
    assert resolve_department_code_for_category("garbage") == "GARBAGE_DEPT"
    assert resolve_department_code_for_category("pothole") == "ROAD_AUTHORITY"
    assert resolve_department_code_for_category("streetlight_failure") == "INFRASTRUCTURE"
    assert resolve_department_code_for_category("water_leak") == "WATER_DEPT"
    assert resolve_department_code_for_category("unknown_class") is None


@pytest.mark.asyncio
async def test_real_inference_execution():
    """Verify actual forward pass runs on generated test image without mock."""
    img_bytes = create_test_image_bytes()
    result = await run_inference_async(img_bytes)

    assert result["model_name"] == "EfficientNetV2-S"
    assert result["model_version"] == "TP100-epoch16"
    assert result["predicted_category"] in model_manager.class_names
    assert 0.0 <= result["confidence_score"] <= 1.0
    assert len(result["all_probabilities"]) == 5
    # Sum of softmax probabilities should be approximately 1.0
    total_prob = sum(result["all_probabilities"].values())
    assert 0.99 <= total_prob <= 1.01
    assert result["suggested_department_code"] in [
        "ROAD_AUTHORITY",
        "GARBAGE_DEPT",
        "INFRASTRUCTURE",
        "WATER_DEPT",
    ]


@pytest.mark.asyncio
async def test_inference_corrupt_bytes_failover():
    """Verify corrupted bytes do not crash the pipeline and return graceful failure."""
    corrupt_bytes = b"NOT_A_REAL_IMAGE_DATA_STREAM"
    result = await run_inference_async(corrupt_bytes)

    assert result["processing_status"] == "FAILED"
    assert result["needs_review"] is True
    assert result["confidence_score"] == 0.0
    assert result["error_message"] is not None
