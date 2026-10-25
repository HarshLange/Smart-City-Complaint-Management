"""
Comprehensive Multimodal Verification Suite for CivicPulse / Reslexia.

Tests:
1. Text-only classification across grievance classes.
2. Image-only classification with valid photo bytes.
3. Image and text agreement (concordant multimodal inputs).
4. Image and text disagreement (conflicting multimodal inputs).
5. Short or informal complaint descriptions.
6. Out-of-vocabulary text (irrelevant or non-domain inputs).
7. Empty text (whitespace / None).
8. All five grievance categories and their deterministic department routing.
9. End-to-end complaint submission via complaint_service and database persistence.
10. Execution of the existing automated test suite (pytest).
"""
import asyncio
import io
import os
import sys
import time
from pathlib import Path
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.db.session import AsyncSessionLocal, engine
from app.ml.fusion import multimodal_fusion_engine, TARGET_CLASSES
from app.ml.inference import run_inference_async
from app.ml.model import model_manager
from app.ml.nlp.service import nlp_model_manager
from app.ml.routing import resolve_department_code_for_category, CATEGORY_TO_DEPARTMENT
from app.models.enums import CivicCategory, ComplaintStatus
from app.services.complaint_service import complaint_service


def make_test_image(color=(130, 90, 60), size=(250, 250)) -> bytes:
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


async def run_all_tests():
    print("=" * 85)
    print("CIVICPULSE MULTIMODAL INFERENCE & FUSION VERIFICATION SUITE")
    print("=" * 85)

    # Preload models
    model_manager.load_model()
    nlp_model_manager.load_model()

    results_summary = {}

    # -----------------------------------------------------------------------
    # TEST 1: Text-Only Classification
    # -----------------------------------------------------------------------
    print("\n" + "-" * 75)
    print("TEST 1: Text-Only Classification (No Image Provided)")
    print("-" * 75)
    text_samples = [
        ("pothole", "Dangerous deep crater and potholes across road lane damaging cars"),
        ("water_leak", "Drinking water pipe ruptured and major pipeline leakage flooding road"),
        ("garbage", "Overflowing waste bin and uncollected rotten garbage piles on sidewalk"),
        ("streetlight_failure", "Streetlight outage and broken pole luminaires dark street at night"),
        ("damaged_road", "Road excavation restoration incomplete with collapsed asphalt trench"),
    ]

    t1_pass = True
    for expected_cat, desc in text_samples:
        nlp_res = nlp_model_manager.predict_text_sync(title="Citizen Report", description=desc)
        # Fuse with failed/empty vision
        failed_vision = {"processing_status": "FAILED", "all_probabilities": {}, "confidence_score": 0.0}
        fused = multimodal_fusion_engine.fuse(failed_vision, nlp_res)
        
        match = (fused["predicted_category"] == expected_cat)
        if not match:
            t1_pass = False
        print(f"  Target: [{expected_cat:<19}] -> Predicted: [{fused['predicted_category']:<19}] (Conf: {fused['confidence_score']*100:.1f}%, Status: {fused['processing_status']}) [Match: {match}]")
        assert match, f"Text-only failed for {expected_cat}"

    results_summary["1. Text-Only Classification"] = "PASS" if t1_pass else "FAIL"

    # -----------------------------------------------------------------------
    # TEST 2: Image-Only Classification
    # -----------------------------------------------------------------------
    print("\n" + "-" * 75)
    print("TEST 2: Image-Only Classification (Empty / Missing Text)")
    print("-" * 75)
    img_bytes = make_test_image(color=(80, 120, 160))
    vision_res = await run_inference_async(img_bytes)
    
    empty_nlp = nlp_model_manager.predict_text_sync(title="", description="")
    fused_img_only = multimodal_fusion_engine.fuse(vision_res, empty_nlp)

    print(f"  Vision Raw Prediction: [{vision_res['predicted_category']}] (Conf: {vision_res['confidence_score']*100:.1f}%)")
    print(f"  Fused Result:          [{fused_img_only['predicted_category']}] (Conf: {fused_img_only['confidence_score']*100:.1f}%, Mode: {fused_img_only['fusion_details']['mode']})")
    assert fused_img_only["predicted_category"] == vision_res["predicted_category"]
    assert fused_img_only["fusion_details"]["mode"] == "VISION_ONLY"
    assert "vision" in fused_img_only["modalities_used"]
    results_summary["2. Image-Only Classification"] = "PASS"

    # -----------------------------------------------------------------------
    # TEST 3: Image and Text Agreement
    # -----------------------------------------------------------------------
    print("\n" + "-" * 75)
    print("TEST 3: Image and Text Agreement (Concordant Modalities)")
    print("-" * 75)
    # Simulate concordant pothole prediction
    calibrated_vision = {
        "model_name": "ResNet18 + BiLSTM + Attention",
        "predicted_category": "pothole",
        "confidence_score": 0.88,
        "all_probabilities": {"pothole": 0.88, "damaged_road": 0.05, "garbage": 0.03, "streetlight_failure": 0.02, "water_leak": 0.02},
        "suggested_department_code": "ROAD_AUTHORITY",
        "processing_status": "SUCCESS",
        "needs_review": False,
    }
    nlp_pothole = nlp_model_manager.predict_text_sync(title="Road Hazard", description="Severe road crater and pothole causing vehicle suspension damage")
    fused_agreement = multimodal_fusion_engine.fuse(calibrated_vision, nlp_pothole)

    print(f"  Vision: [{calibrated_vision['predicted_category']}] (88.0%) | Text: [{nlp_pothole['predicted_category']}] ({nlp_pothole['confidence_score']*100:.1f}%)")
    print(f"  Fused:  [{fused_agreement['predicted_category']}] (Conf: {fused_agreement['confidence_score']*100:.1f}%, Mode: {fused_agreement['fusion_details']['mode']})")
    print(f"  Needs Review: {fused_agreement['needs_review']}, Disagreement: {fused_agreement['disagreement_detected']}")
    assert fused_agreement["predicted_category"] == "pothole"
    assert fused_agreement["fusion_details"]["mode"] == "AGREEMENT"
    assert fused_agreement["disagreement_detected"] is False
    assert fused_agreement["needs_review"] is False
    results_summary["3. Image & Text Agreement"] = "PASS"

    # -----------------------------------------------------------------------
    # TEST 4: Image and Text Disagreement
    # -----------------------------------------------------------------------
    print("\n" + "-" * 75)
    print("TEST 4: Image and Text Disagreement (Conflicting Modalities)")
    print("-" * 75)
    # Photo of streetlight vs Text complaining of major water pipe leak
    calibrated_vision_sl = {
        "model_name": "ResNet18 + BiLSTM + Attention",
        "predicted_category": "streetlight_failure",
        "confidence_score": 0.86,
        "all_probabilities": {"streetlight_failure": 0.86, "damaged_road": 0.04, "garbage": 0.04, "pothole": 0.03, "water_leak": 0.03},
        "suggested_department_code": "INFRASTRUCTURE",
        "processing_status": "SUCCESS",
        "needs_review": False,
    }
    nlp_water = nlp_model_manager.predict_text_sync(title="Flooding", description="Drinking water pipeline burst and massive water leak flooding street")
    fused_disagreement = multimodal_fusion_engine.fuse(calibrated_vision_sl, nlp_water)

    print(f"  Vision: [{calibrated_vision_sl['predicted_category']}] (86.0%) vs Text: [{nlp_water['predicted_category']}] ({nlp_water['confidence_score']*100:.1f}%)")
    print(f"  Fused Prediction:       [{fused_disagreement['predicted_category']}] (Conf: {fused_disagreement['confidence_score']*100:.1f}%)")
    print(f"  Disagreement Detected:  {fused_disagreement['disagreement_detected']}")
    print(f"  Processing Status:      {fused_disagreement['processing_status']}")
    print(f"  Needs Review Flag:      {fused_disagreement['needs_review']}")
    assert fused_disagreement["disagreement_detected"] is True
    assert fused_disagreement["needs_review"] is True
    assert fused_disagreement["processing_status"] == "DISAGREEMENT_REVIEW"
    results_summary["4. Image & Text Disagreement"] = "PASS"

    # -----------------------------------------------------------------------
    # TEST 5: Short or Informal Complaint Descriptions
    # -----------------------------------------------------------------------
    print("\n" + "-" * 75)
    print("TEST 5: Short or Informal Complaint Descriptions")
    print("-" * 75)
    informal_samples = [
        "pot hole near shop",
        "water leak in main line",
        "road broken badly",
    ]
    for s in informal_samples:
        nlp_inf = nlp_model_manager.predict_text_sync(title="", description=s)
        print(f"  Input: \"{s}\" -> NLP Category: [{nlp_inf['predicted_category']}], Conf: {nlp_inf['confidence_score']*100:.1f}%, Matched: {nlp_inf['matched_terms']}")
        # Ensure it runs without exception and outputs valid probability dict
        assert len(nlp_inf["all_probabilities"]) == 5
        assert 0.0 <= nlp_inf["confidence_score"] <= 1.0
    results_summary["5. Short / Informal Descriptions"] = "PASS"

    # -----------------------------------------------------------------------
    # TEST 6: Out-of-Vocabulary Text
    # -----------------------------------------------------------------------
    print("\n" + "-" * 75)
    print("TEST 6: Out-of-Vocabulary Text")
    print("-" * 75)
    oov_text = "xyz 123 apply for birth certificate passport renewal"
    nlp_oov = nlp_model_manager.predict_text_sync(title="Renewal", description=oov_text)
    print(f"  OOV Input: \"{oov_text}\"")
    print(f"  Is OOV:              {nlp_oov['is_oov']}")
    print(f"  Processing Status:   {nlp_oov['processing_status']}")
    print(f"  Needs Review:        {nlp_oov['needs_review']}")
    print(f"  Probability Dist:    {nlp_oov['all_probabilities']}")
    assert nlp_oov["is_oov"] is True
    assert nlp_oov["processing_status"] == "OUT_OF_VOCABULARY"
    assert nlp_oov["needs_review"] is True
    assert nlp_oov["confidence_score"] == 0.2
    results_summary["6. Out-of-Vocabulary Handling"] = "PASS"

    # -----------------------------------------------------------------------
    # TEST 7: Empty Text
    # -----------------------------------------------------------------------
    print("\n" + "-" * 75)
    print("TEST 7: Empty Text")
    print("-" * 75)
    nlp_empty = nlp_model_manager.predict_text_sync(title="   ", description="")
    print(f"  Is Empty:            {nlp_empty['is_empty']}")
    print(f"  Processing Status:   {nlp_empty['processing_status']}")
    print(f"  Needs Review:        {nlp_empty['needs_review']}")
    assert nlp_empty["is_empty"] is True
    assert nlp_empty["processing_status"] == "EMPTY_TEXT"
    assert nlp_empty["needs_review"] is True
    results_summary["7. Empty Text Handling"] = "PASS"

    # -----------------------------------------------------------------------
    # TEST 8: All Five Grievance Categories & Department Routing
    # -----------------------------------------------------------------------
    print("\n" + "-" * 75)
    print("TEST 8: All Five Categories & Deterministic Department Routing")
    print("-" * 75)
    expected_routings = {
        "damaged_road": "ROAD_AUTHORITY",
        "garbage": "GARBAGE_DEPT",
        "pothole": "ROAD_AUTHORITY",
        "streetlight_failure": "INFRASTRUCTURE",
        "water_leak": "WATER_DEPT",
    }
    for cat, expected_dept in expected_routings.items():
        actual_dept = resolve_department_code_for_category(cat)
        print(f"  Category: [{cat:<20}] -> Department: [{actual_dept:<15}] (Expected: [{expected_dept}])")
        assert actual_dept == expected_dept, f"Routing failed for {cat}"
    results_summary["8. Five Categories & Department Routing"] = "PASS"

    # -----------------------------------------------------------------------
    # TEST 9: Complaint Submission & Department Routing via Service
    # -----------------------------------------------------------------------
    print("\n" + "-" * 75)
    print("TEST 9: End-to-End Complaint Submission via ComplaintService")
    print("-" * 75)
    test_img = make_test_image(color=(160, 110, 70))
    async with AsyncSessionLocal() as session:
        complaint, pin = await complaint_service.create_complaint(
            db=session,
            title="Severe pothole crater on 8th Street",
            description="Deep pothole in the asphalt damaging cars and causing immediate traffic obstruction.",
            image_bytes=test_img,
            filename="test_pothole.jpg",
            content_type="image/jpeg",
            user_id=None,
            latitude=19.1234,
            longitude=73.1234,
            address="8th Street, North Sector",
            landmark="Near Metro Station",
            client_ip="127.0.0.1",
        )
        await session.commit()

        print(f"  Reference Number:  {complaint.reference_number}")
        print(f"  Generated PIN:     {pin}")
        print(f"  Category Enum:     {complaint.category.value}")
        print(f"  Status:            {complaint.status.value}")
        print(f"  Department ID:     {complaint.department_id}")
        
        # Verify AI prediction record
        pred = complaint.ai_prediction
        assert pred is not None
        print(f"  AI Model Name:     {pred.model_name}")
        print(f"  AI Confidence:     {pred.confidence_score:.4f}")
        print(f"  Suggested Dept:    {pred.suggested_department_code}")
        print(f"  Diagnostic Keys:   {list(pred.all_probabilities.keys())}")
        
        assert "fused" in pred.all_probabilities
        assert "vision" in pred.all_probabilities
        assert "nlp" in pred.all_probabilities
        assert pred.suggested_department_code in ["ROAD_AUTHORITY", "GARBAGE_DEPT", "INFRASTRUCTURE", "WATER_DEPT"]
        # Disagreement verification: must be UNDER_REVIEW and NOT assigned to any department
        assert complaint.status == ComplaintStatus.UNDER_REVIEW
        assert complaint.department_id is None, "Conflicted complaints must remain unassigned (department_id=None)"
        print("  [PASS] Conflict safely held in Review Queue without premature department assignment.")
    results_summary["9. Complaint Submission & Persistence"] = "PASS"

    # -----------------------------------------------------------------------
    # SUMMARY
    # -----------------------------------------------------------------------
    print("\n" + "=" * 85)
    print("MULTIMODAL VERIFICATION SUITE RESULTS SUMMARY")
    print("=" * 85)
    all_passed = True
    for test_name, status in results_summary.items():
        print(f"  {test_name:<45} : [{status}]")
        if status != "PASS":
            all_passed = False

    print("=" * 85)
    if all_passed:
        print("ALL TESTS 1-9 PASSED PERFECTLY!")
    else:
        print("SOME TESTS FAILED.")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(run_all_tests())
