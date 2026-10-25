import pytest
from app.ml.fusion import multimodal_fusion_engine, TARGET_CLASSES
from app.ml.nlp.service import nlp_model_manager, clean_text
from app.ml.routing import resolve_department_code_for_category


def test_nlp_text_cleaning():
    """Verify clean_text standardizes raw citizen text properly."""
    raw = "  Urgent! Pothole at https://example.com/crater on 5th Ave. #danger  "
    cleaned = clean_text(raw)
    assert "https" not in cleaned
    assert "urgent pothole at on 5th ave danger" == cleaned


def test_nlp_model_loading_and_vocab():
    """Verify NLP model manager initializes singleton with expected 5 classes."""
    if not nlp_model_manager.is_loaded:
        nlp_model_manager.load_model()
    assert nlp_model_manager.is_loaded is True
    assert nlp_model_manager.class_names == [
        "damaged_road",
        "garbage",
        "pothole",
        "streetlight_failure",
        "water_leak",
    ]


def test_nlp_prediction_valid_input():
    """Verify NLP classifier outputs valid probabilities for clear grievance."""
    res = nlp_model_manager.predict_text_sync(
        title="Pipe Burst",
        description="Drinking water pipe ruptured and major pipeline leakage flooding road",
    )
    assert res["predicted_category"] == "water_leak"
    assert res["confidence_score"] > 0.50
    assert res["is_oov"] is False
    assert res["is_empty"] is False
    assert len(res["all_probabilities"]) == 5
    prob_sum = sum(res["all_probabilities"].values())
    assert 0.99 <= prob_sum <= 1.01


def test_nlp_oov_handling():
    """Verify out-of-vocabulary text defaults safely to uniform distribution and flags review."""
    res = nlp_model_manager.predict_text_sync(
        title="Passport",
        description="xyz 123 apply for birth certificate passport renewal",
    )
    assert res["is_oov"] is True
    assert res["processing_status"] == "OUT_OF_VOCABULARY"
    assert res["needs_review"] is True
    assert res["confidence_score"] == 0.2
    for cls in TARGET_CLASSES:
        assert res["all_probabilities"][cls] == 0.2


def test_nlp_empty_handling():
    """Verify empty text handles gracefully with review flag."""
    res = nlp_model_manager.predict_text_sync(title="   ", description="")
    assert res["is_empty"] is True
    assert res["processing_status"] == "EMPTY_TEXT"
    assert res["needs_review"] is True


def test_multimodal_fusion_agreement():
    """Verify concordant vision and text corroborate category without review flag."""
    vision_res = {
        "model_name": "ResNet18 + BiLSTM + Attention",
        "predicted_category": "garbage",
        "confidence_score": 0.88,
        "all_probabilities": {"garbage": 0.88, "damaged_road": 0.03, "pothole": 0.03, "streetlight_failure": 0.03, "water_leak": 0.03},
        "suggested_department_code": "GARBAGE_DEPT",
        "processing_status": "SUCCESS",
        "needs_review": False,
    }
    nlp_res = nlp_model_manager.predict_text_sync(
        title="Waste Bin Overflow",
        description="Public bin overflow and rotten garbage littering the street",
    )
    fused = multimodal_fusion_engine.fuse(vision_res, nlp_res)
    assert fused["predicted_category"] == "garbage"
    assert fused["disagreement_detected"] is False
    assert fused["needs_review"] is False
    assert fused["fusion_details"]["mode"] == "AGREEMENT"
    assert fused["suggested_department_code"] == "GARBAGE_DEPT"


def test_multimodal_fusion_disagreement():
    """Verify conflicting vision and text trigger review flag and disagreement state."""
    vision_res = {
        "model_name": "ResNet18 + BiLSTM + Attention",
        "predicted_category": "pothole",
        "confidence_score": 0.85,
        "all_probabilities": {"pothole": 0.85, "damaged_road": 0.05, "garbage": 0.04, "streetlight_failure": 0.03, "water_leak": 0.03},
        "suggested_department_code": "ROAD_AUTHORITY",
        "processing_status": "SUCCESS",
        "needs_review": False,
    }
    nlp_res = nlp_model_manager.predict_text_sync(
        title="Streetlight Problem",
        description="Streetlight outage and broken pole light complete dark street at night",
    )
    fused = multimodal_fusion_engine.fuse(vision_res, nlp_res)
    assert fused["disagreement_detected"] is True
    assert fused["needs_review"] is True
    assert fused["processing_status"] == "DISAGREEMENT_REVIEW"


def test_multimodal_fusion_vision_only():
    """Verify vision-dominant fallback when text is empty."""
    vision_res = {
        "model_name": "ResNet18 + BiLSTM + Attention",
        "predicted_category": "streetlight_failure",
        "confidence_score": 0.90,
        "all_probabilities": {"streetlight_failure": 0.90, "damaged_road": 0.03, "garbage": 0.03, "pothole": 0.02, "water_leak": 0.02},
        "suggested_department_code": "INFRASTRUCTURE",
        "processing_status": "SUCCESS",
        "needs_review": False,
    }
    nlp_res = nlp_model_manager.predict_text_sync(title="", description="")
    fused = multimodal_fusion_engine.fuse(vision_res, nlp_res)
    assert fused["predicted_category"] == "streetlight_failure"
    assert fused["fusion_details"]["mode"] == "VISION_ONLY"
    assert fused["needs_review"] is False


def test_multimodal_fusion_text_only():
    """Verify text-dominant fallback when image is missing."""
    vision_res = {"processing_status": "FAILED", "all_probabilities": {}, "confidence_score": 0.0}
    nlp_res = nlp_model_manager.predict_text_sync(
        title="Water Main",
        description="Drinking water pipe ruptured and major pipeline leakage flooding road",
    )
    fused = multimodal_fusion_engine.fuse(vision_res, nlp_res)
    assert fused["predicted_category"] == "water_leak"
    assert fused["fusion_details"]["mode"] == "TEXT_ONLY"
    assert fused["suggested_department_code"] == "WATER_DEPT"
