"""
Multimodal Decision and Fusion Engine for CivicPulse / Reslexia.

Fuses multimodal evidence from:
1. Visual Classifier (ResNet18 + BiLSTM + Additive Attention)
2. Text Classifier (TF-IDF + Multinomial Logistic Regression)

Implements dynamic quality-weighted probability combination, explicit
agreement reinforcement, conflict detection, and safe fallback.
"""
import logging
from typing import Any, Dict, List, Optional, Tuple
from app.config import settings
from app.ml.routing import resolve_department_code_for_category

logger = logging.getLogger(__name__)

TARGET_CLASSES: List[str] = [
    "damaged_road",
    "garbage",
    "pothole",
    "streetlight_failure",
    "water_leak",
]


class MultimodalFusionEngine:
    """
    Production-grade multimodal fusion engine for civic grievance classification.
    Calibrates vision and text probability streams without unweighted blind averaging.
    """

    def __init__(self):
        self.target_classes = TARGET_CLASSES
        self.class_set = set(TARGET_CLASSES)

    def _extract_prob_vector(
        self, prob_dict: Optional[Dict[str, float]]
    ) -> Dict[str, float]:
        """Align probabilities into canonical class keys with sum verification."""
        if not prob_dict:
            flat = 1.0 / len(self.target_classes)
            return {c: flat for c in self.target_classes}

        vector = {}
        for c in self.target_classes:
            vector[c] = float(prob_dict.get(c, 0.0))

        total = sum(vector.values())
        if total > 0.0:
            vector = {c: v / total for c, v in vector.items()}
        else:
            flat = 1.0 / len(self.target_classes)
            vector = {c: flat for c in self.target_classes}
        return vector

    def fuse(
        self,
        vision_result: Dict[str, Any],
        nlp_result: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Execute evidence-weighted multimodal fusion across vision and text predictions.
        
        Decision Matrix:
        1. Both valid & agree     -> Reinforced confidence, SUCCESS.
        2. Both valid & disagree  -> Weighted fusion, DISAGREEMENT_REVIEW (needs_review=True).
        3. Vision only / Text OOV -> Vision dominant, validated threshold.
        4. Text only / Image fail -> Text dominant, confidence thresholding.
        5. Neither valid          -> Fallback to 'other', needs_review=True.
        """
        # 1. Modality status checks
        vision_failed = (
            vision_result.get("processing_status") == "FAILED"
            or not bool(vision_result.get("all_probabilities"))
        )
        nlp_empty = nlp_result.get("is_empty", False)
        nlp_oov = nlp_result.get("is_oov", False)
        nlp_failed = (
            nlp_result.get("processing_status") == "FAILED"
            or nlp_empty
            or nlp_oov
        )

        P_v = self._extract_prob_vector(vision_result.get("all_probabilities"))
        P_t = self._extract_prob_vector(nlp_result.get("all_probabilities"))

        cat_v = vision_result.get("predicted_category", "other")
        conf_v = float(vision_result.get("confidence_score", 0.0))

        cat_t = nlp_result.get("predicted_category", "other")
        conf_t = float(nlp_result.get("confidence_score", 0.0))
        matched_terms = nlp_result.get("matched_terms", [])

        # -------------------------------------------------------------------
        # CASE 1: Fallback if neither modality is operational
        # -------------------------------------------------------------------
        if vision_failed and nlp_failed:
            flat_dict = {c: round(1.0 / len(self.target_classes), 4) for c in self.target_classes}
            return {
                "model_name": "Multimodal Fusion (Fallback)",
                "model_version": "Fusion-v1",
                "predicted_category": "other",
                "confidence_score": 0.0,
                "all_probabilities": flat_dict,
                "suggested_department_code": "",
                "processing_status": "FAILED",
                "needs_review": True,
                "disagreement_detected": False,
                "modalities_used": [],
                "fusion_details": {
                    "mode": "FALLBACK",
                    "reason": "Both visual inference and text parsing produced no evidence.",
                    "vision_status": vision_result.get("processing_status"),
                    "nlp_status": nlp_result.get("processing_status"),
                },
            }

        # -------------------------------------------------------------------
        # CASE 2: Image Only (Text is empty, OOV, or missing)
        # -------------------------------------------------------------------
        if nlp_failed and not vision_failed:
            suggested_dept = resolve_department_code_for_category(cat_v) or "INFRASTRUCTURE"
            is_confident = conf_v >= settings.AI_CONFIDENCE_THRESHOLD
            status = "SUCCESS" if is_confident else "LOW_CONFIDENCE"
            
            return {
                "model_name": "Multimodal Fusion (Vision-Dominant)",
                "model_version": "Fusion-v1",
                "predicted_category": cat_v,
                "confidence_score": round(conf_v, 4),
                "all_probabilities": {c: round(p, 4) for c, p in P_v.items()},
                "suggested_department_code": suggested_dept,
                "processing_status": status,
                "needs_review": not is_confident,
                "disagreement_detected": False,
                "modalities_used": ["vision"],
                "fusion_details": {
                    "mode": "VISION_ONLY",
                    "reason": "Text is empty or out-of-vocabulary; relying on visual features.",
                    "vision_category": cat_v,
                    "vision_confidence": conf_v,
                    "nlp_status": nlp_result.get("processing_status"),
                },
            }

        # -------------------------------------------------------------------
        # CASE 3: Text Only (Image is missing, corrupted, or failed)
        # -------------------------------------------------------------------
        if vision_failed and not nlp_failed:
            suggested_dept = resolve_department_code_for_category(cat_t) or "INFRASTRUCTURE"
            is_confident = (conf_t >= 0.50) and (len(matched_terms) >= 1)
            status = "SUCCESS" if is_confident else "LOW_CONFIDENCE"

            return {
                "model_name": "Multimodal Fusion (Text-Dominant)",
                "model_version": "Fusion-v1",
                "predicted_category": cat_t,
                "confidence_score": round(conf_t, 4),
                "all_probabilities": {c: round(p, 4) for c, p in P_t.items()},
                "suggested_department_code": suggested_dept,
                "processing_status": status,
                "needs_review": not is_confident,
                "disagreement_detected": False,
                "modalities_used": ["nlp"],
                "fusion_details": {
                    "mode": "TEXT_ONLY",
                    "reason": "Photograph unavailable or failed; relying on textual grievance.",
                    "nlp_category": cat_t,
                    "nlp_confidence": conf_t,
                    "matched_terms": matched_terms,
                    "vision_status": vision_result.get("processing_status"),
                },
            }

        # -------------------------------------------------------------------
        # CASE 4: Both Modalities Available -> Dual Fusion
        # -------------------------------------------------------------------
        # Determine informativeness of text evidence:
        # With 5 classes, uniform random distribution is 0.20.
        # Text with confidence < 0.35 or zero domain terms contains negligible evidence.
        text_is_informative = (conf_t >= 0.35) and (len(matched_terms) >= 1)

        if not text_is_informative:
            # Casual, brief, or generic text: vision takes primary weight (95%)
            # Prevents uninformative text from penalizing confident photo evidence
            w_v_raw = 0.95
            w_t_raw = 0.05
        elif conf_t >= 0.60 and len(matched_terms) >= 2:
            # High-confidence, descriptive grievance text: standard multimodal weighting
            w_v_raw = 0.60
            w_t_raw = 0.40
        else:
            # Moderate text confidence: vision-dominant with text refinement
            w_v_raw = 0.70
            w_t_raw = 0.30

        norm = w_v_raw + w_t_raw
        w_v = w_v_raw / norm
        w_t = w_t_raw / norm

        # Convex probability fusion
        P_fused: Dict[str, float] = {}
        for c in self.target_classes:
            P_fused[c] = (w_v * P_v[c]) + (w_t * P_t[c])

        # Normalize to ensure sum is exactly 1.0
        total_p = sum(P_fused.values())
        if total_p > 0:
            P_fused = {c: p / total_p for c, p in P_fused.items()}

        top_cat = max(P_fused.keys(), key=lambda k: P_fused[k])
        top_conf = float(P_fused[top_cat])

        agreement = (cat_v == cat_t)

        if agreement:
            # Models corroborate each other on the same defect category
            # Agreement provides corroborating evidence: confident if fused confidence meets threshold,
            # or if the visual classifier was confident (>= AI_CONFIDENCE_THRESHOLD) and corroborated by text
            is_confident = (
                (top_conf >= settings.AI_CONFIDENCE_THRESHOLD)
                or (conf_v >= settings.AI_CONFIDENCE_THRESHOLD)
                or (top_conf >= 0.70 and conf_v >= 0.70 and conf_t >= 0.50)
            )
            status = "SUCCESS" if is_confident else "LOW_CONFIDENCE"
            needs_review = not is_confident

            suggested_dept = resolve_department_code_for_category(top_cat) or "INFRASTRUCTURE"

            return {
                "model_name": "Multimodal Fusion (ResNet18+BiLSTM+Attention + TF-IDF+LogReg)",
                "model_version": "Fusion-v1",
                "predicted_category": top_cat,
                "confidence_score": round(top_conf, 4),
                "all_probabilities": {c: round(p, 4) for c, p in P_fused.items()},
                "suggested_department_code": suggested_dept,
                "processing_status": status,
                "needs_review": needs_review,
                "disagreement_detected": False,
                "modalities_used": ["vision", "nlp"],
                "fusion_details": {
                    "mode": "AGREEMENT",
                    "vision_category": cat_v,
                    "vision_confidence": round(conf_v, 4),
                    "nlp_category": cat_t,
                    "nlp_confidence": round(conf_t, 4),
                    "weights": {"vision": round(w_v, 3), "nlp": round(w_t, 3)},
                    "matched_terms": matched_terms,
                },
            }

        else:
            # Models disagree
            # If text is weak / low confidence, vision can override if vision is confident
            if w_t_raw <= 0.15 and conf_v >= 0.55:
                # Mild disagreement where text is vague/casual: vision prevails
                suggested_dept = resolve_department_code_for_category(top_cat) or "INFRASTRUCTURE"
                return {
                    "model_name": "Multimodal Fusion (Vision-Resolved)",
                    "model_version": "Fusion-v1",
                    "predicted_category": top_cat,
                    "confidence_score": round(top_conf, 4),
                    "all_probabilities": {c: round(p, 4) for c, p in P_fused.items()},
                    "suggested_department_code": suggested_dept,
                    "processing_status": "SUCCESS",
                    "needs_review": False,
                    "disagreement_detected": False,
                    "modalities_used": ["vision", "nlp"],
                    "fusion_details": {
                        "mode": "WEAK_TEXT_DISAGREEMENT",
                        "resolved_to": top_cat,
                        "vision_category": cat_v,
                        "vision_confidence": round(conf_v, 4),
                        "nlp_category": cat_t,
                        "nlp_confidence": round(conf_t, 4),
                        "weights": {"vision": round(w_v, 3), "nlp": round(w_t, 3)},
                    },
                }

            # Strong conflict between confident vision and confident text:
            # Route with fused category but flag for human review
            suggested_dept = resolve_department_code_for_category(top_cat) or "INFRASTRUCTURE"
            logger.warning(
                "Multimodal disagreement detected: Vision=%s (%.2f) vs NLP=%s (%.2f). Flagging for review.",
                cat_v,
                conf_v,
                cat_t,
                conf_t,
            )

            return {
                "model_name": "Multimodal Fusion (Disagreement-Review)",
                "model_version": "Fusion-v1",
                "predicted_category": top_cat,
                "confidence_score": round(top_conf, 4),
                "all_probabilities": {c: round(p, 4) for c, p in P_fused.items()},
                "suggested_department_code": suggested_dept,
                "processing_status": "DISAGREEMENT_REVIEW",
                "needs_review": True,
                "disagreement_detected": True,
                "modalities_used": ["vision", "nlp"],
                "fusion_details": {
                    "mode": "STRONG_DISAGREEMENT",
                    "reason": f"Conflict between visual detection ({cat_v}) and textual grievance ({cat_t}).",
                    "vision_category": cat_v,
                    "vision_confidence": round(conf_v, 4),
                    "nlp_category": cat_t,
                    "nlp_confidence": round(conf_t, 4),
                    "weights": {"vision": round(w_v, 3), "nlp": round(w_t, 3)},
                    "matched_terms": matched_terms,
                },
            }


multimodal_fusion_engine = MultimodalFusionEngine()
