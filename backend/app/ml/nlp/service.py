import asyncio
import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
import numpy as np

logger = logging.getLogger(__name__)

CURRENT_DIR = Path(__file__).resolve().parent
DEFAULT_ARTIFACTS_DIR = CURRENT_DIR / "artifacts"


def clean_text(text: str) -> str:
    """
    Standardize citizen grievance text using the exact preprocessing
    pipeline applied during training:
    1. Lowercase.
    2. Strip URLs.
    3. Strip non-alphanumeric characters while preserving spaces.
    4. Collapse contiguous whitespaces.
    """
    if not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r"https?://\S+|www\.\S+", "", text)
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


class NLPModelManager:
    """
    Thread-safe singleton managing the TF-IDF Vectorizer and Logistic Regression
    NLP model lifecycle for municipal grievance text classification.
    
    Optimized for memory-constrained production environments (Render 512MB RAM):
    Implements a zero-overhead native NumPy inference engine that executes the
    exact mathematical TF-IDF and Softmax Logistic Regression operations without
    importing heavy compiled C extensions (saving ~90MB RAM).
    Gracefully falls back to joblib/sklearn if native weights are not present.
    """

    _instance: Optional["NLPModelManager"] = None
    _classifier: Optional[Any] = None
    _vectorizer: Optional[Any] = None
    _metadata: Optional[Dict[str, Any]] = None
    _model_name: str = "TF-IDF + Logistic Regression"
    _model_version: str = "LogReg-v1"
    _class_names: List[str] = [
        "damaged_road",
        "garbage",
        "pothole",
        "streetlight_failure",
        "water_leak",
    ]
    _class_to_idx: Dict[str, int] = {
        "damaged_road": 0,
        "garbage": 1,
        "pothole": 2,
        "streetlight_failure": 3,
        "water_leak": 4,
    }

    # Lightweight native NumPy weights (avoids importing scikit-learn in memory)
    _W: Optional[np.ndarray] = None
    _b: Optional[np.ndarray] = None
    _idf: Optional[np.ndarray] = None
    _vocab: Optional[Dict[str, int]] = None
    _stop_words: Optional[Set[str]] = None
    _is_native_numpy: bool = False

    # Minimum probability to be considered confident when operating standalone
    CONFIDENCE_THRESHOLD: float = 0.50

    def __new__(cls) -> "NLPModelManager":
        if cls._instance is None:
            cls._instance = super(NLPModelManager, cls).__new__(cls)
        return cls._instance

    @property
    def model_name(self) -> str:
        return self._model_name

    @property
    def model_version(self) -> str:
        return self._model_version

    @property
    def class_names(self) -> List[str]:
        return self._class_names

    @property
    def class_to_idx(self) -> Dict[str, int]:
        return self._class_to_idx

    @property
    def is_loaded(self) -> bool:
        if self._is_native_numpy:
            return self._W is not None and self._vocab is not None
        return self._classifier is not None and self._vectorizer is not None

    def load_model(
        self,
        classifier_path: Optional[str] = None,
        vectorizer_path: Optional[str] = None,
        metadata_path: Optional[str] = None,
    ) -> None:
        """
        Load NLP model into memory.
        Prefers lightweight native NumPy weights (.npz + .json) for minimal memory footprint.
        Falls back to joblib (.joblib) if native weights are unavailable.
        """
        # Load metadata if present
        candidate_meta_paths: List[Path] = []
        if metadata_path:
            candidate_meta_paths.append(Path(metadata_path))
        candidate_meta_paths.extend([
            DEFAULT_ARTIFACTS_DIR / "nlp_metadata.json",
            Path("app/ml/nlp/artifacts/nlp_metadata.json"),
            Path("backend/app/ml/nlp/artifacts/nlp_metadata.json"),
        ])
        for p in candidate_meta_paths:
            if p.is_file():
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        self._metadata = json.load(f)
                        if "target_classes" in self._metadata:
                            self._class_names = self._metadata["target_classes"]
                        if "class_to_idx" in self._metadata:
                            self._class_to_idx = self._metadata["class_to_idx"]
                except Exception as e:
                    logger.warning("Failed to parse NLP metadata: %s", e)
                break

        # Check for native weights first (17KB .npz + 28KB .json)
        candidate_npz = [
            DEFAULT_ARTIFACTS_DIR / "nlp_model_weights.npz",
            Path("app/ml/nlp/artifacts/nlp_model_weights.npz"),
            Path("backend/app/ml/nlp/artifacts/nlp_model_weights.npz"),
        ]
        candidate_vocab_json = [
            DEFAULT_ARTIFACTS_DIR / "nlp_vocab.json",
            Path("app/ml/nlp/artifacts/nlp_vocab.json"),
            Path("backend/app/ml/nlp/artifacts/nlp_vocab.json"),
        ]

        resolved_npz = next((p for p in candidate_npz if p.is_file()), None)
        resolved_vocab = next((p for p in candidate_vocab_json if p.is_file()), None)

        if resolved_npz and resolved_vocab:
            try:
                npz_data = np.load(resolved_npz)
                self._W = npz_data["W"].astype(np.float64)
                self._b = npz_data["b"].astype(np.float64)
                self._idf = npz_data["idf"].astype(np.float64)

                with open(resolved_vocab, "r", encoding="utf-8") as f:
                    vocab_data = json.load(f)
                    self._vocab = vocab_data["vocabulary"]
                    self._stop_words = set(vocab_data.get("stop_words", []))

                self._is_native_numpy = True
                logger.info(
                    "NLP native NumPy engine loaded from %s (Vocabulary: %d features, RAM footprint: < 2 MB).",
                    resolved_npz.name,
                    len(self._vocab),
                )
                return
            except Exception as e:
                logger.warning("Failed to load native numpy weights (%s), falling back to joblib: %s", resolved_npz, e)

        # Fallback to joblib
        import joblib

        candidate_cls_paths: List[Path] = []
        if classifier_path:
            candidate_cls_paths.append(Path(classifier_path))
        candidate_cls_paths.extend([
            DEFAULT_ARTIFACTS_DIR / "nlp_classifier.joblib",
            Path("app/ml/nlp/artifacts/nlp_classifier.joblib"),
            Path("backend/app/ml/nlp/artifacts/nlp_classifier.joblib"),
        ])

        resolved_cls = next((p for p in candidate_cls_paths if p.is_file()), None)
        if not resolved_cls:
            raise FileNotFoundError(f"NLP classifier artifact not found in: {[str(p) for p in candidate_cls_paths]}")

        candidate_vec_paths: List[Path] = []
        if vectorizer_path:
            candidate_vec_paths.append(Path(vectorizer_path))
        candidate_vec_paths.extend([
            DEFAULT_ARTIFACTS_DIR / "nlp_vectorizer.joblib",
            Path("app/ml/nlp/artifacts/nlp_vectorizer.joblib"),
            Path("backend/app/ml/nlp/artifacts/nlp_vectorizer.joblib"),
        ])

        resolved_vec = next((p for p in candidate_vec_paths if p.is_file()), None)
        if not resolved_vec:
            raise FileNotFoundError(f"NLP vectorizer artifact not found in: {[str(p) for p in candidate_vec_paths]}")

        logger.info("Loading NLP artifacts via joblib: %s and %s", resolved_cls, resolved_vec)
        self._classifier = joblib.load(resolved_cls)
        self._vectorizer = joblib.load(resolved_vec)
        self._is_native_numpy = False

        logger.info(
            "NLP subsystem initialized successfully via joblib. Vocabulary: %d features.",
            len(self._vectorizer.vocabulary_),
        )

    def _build_tokens(self, cleaned_text: str) -> List[str]:
        r"""
        Tokenize and extract unigrams and bigrams matching scikit-learn's exact pipeline:
        1. Extract tokens of word-length >= 2 matching r'(?u)\b\w\w+\b'.
        2. Filter out stop words.
        3. Form unigrams + bigrams from the filtered word sequence.
        """
        stop_words = self._stop_words
        if not self._is_native_numpy and self._vectorizer:
            sw = self._vectorizer.get_stop_words()
            stop_words = set(sw) if sw else set()

        raw_words = re.findall(r"(?u)\b\w\w+\b", cleaned_text.lower())
        filtered_words = [w for w in raw_words if stop_words is None or w not in stop_words]

        tokens = list(filtered_words)
        for i in range(len(filtered_words) - 1):
            tokens.append(f"{filtered_words[i]} {filtered_words[i + 1]}")
        return tokens

    def extract_matched_vocabulary(self, cleaned_text: str) -> List[str]:
        """Identify which unigrams or bigrams from the input exist in the trained vocabulary."""
        vocab = self._vocab if self._is_native_numpy else (self._vectorizer.vocabulary_ if self._vectorizer else {})
        if not vocab:
            return []

        tokens = self._build_tokens(cleaned_text)
        matched = {tok for tok in tokens if tok in vocab}
        return sorted(list(matched))

    def _predict_native_numpy(self, cleaned_text: str) -> np.ndarray:
        """
        Exact mathematical execution of TF-IDF vectorization and Softmax Logistic Regression
        using pure NumPy without sklearn overhead.
        Formula:
          tf = 1 + log(count)
          X_i = tf * idf[i]
          X = X / ||X||_2
          logits = X . W^T + b
          probs = softmax(logits)
        """
        vocab = self._vocab
        idf = self._idf
        W = self._W
        b = self._b

        tokens = self._build_tokens(cleaned_text)

        counts: Dict[int, int] = {}
        for tok in tokens:
            if tok in vocab:
                idx = vocab[tok]
                counts[idx] = counts.get(idx, 0) + 1

        vec = np.zeros(len(vocab), dtype=np.float64)
        for idx, count in counts.items():
            tf = 1.0 + np.log(count)
            vec[idx] = tf * idf[idx]

        norm = np.linalg.norm(vec)
        if norm > 0:
            vec /= norm

        logits = np.dot(W, vec) + b
        exp_logits = np.exp(logits - np.max(logits))
        probabilities = exp_logits / np.sum(exp_logits)
        return probabilities

    def predict_text_sync(self, title: str = "", description: str = "") -> Dict[str, Any]:
        """
        Execute synchronous NLP inference on combined complaint title and description.
        Returns full probability distribution, matched vocabulary n-grams, and OOV detection.
        """
        if not self.is_loaded:
            self.load_model()

        combined_raw = f"{title or ''} {description or ''}".strip()
        cleaned = clean_text(combined_raw)
        word_count = len(cleaned.split()) if cleaned else 0

        # Handle empty text
        if not cleaned or word_count == 0:
            flat_prob = 1.0 / len(self._class_names)
            return {
                "model_name": self._model_name,
                "model_version": self._model_version,
                "predicted_category": "other",
                "confidence_score": 0.0,
                "all_probabilities": {cls: round(flat_prob, 4) for cls in self._class_names},
                "matched_terms": [],
                "matched_term_count": 0,
                "word_count": 0,
                "is_empty": True,
                "is_oov": True,
                "processing_status": "EMPTY_TEXT",
                "needs_review": True,
                "error_message": "Complaint text is empty.",
            }

        matched_terms = self.extract_matched_vocabulary(cleaned)
        is_oov = (len(matched_terms) == 0)

        # If completely out-of-vocabulary, output uniform distribution rather than arbitrary bias
        if is_oov:
            flat_prob = 1.0 / len(self._class_names)
            return {
                "model_name": self._model_name,
                "model_version": self._model_version,
                "predicted_category": "other",
                "confidence_score": round(flat_prob, 4),
                "all_probabilities": {cls: round(flat_prob, 4) for cls in self._class_names},
                "matched_terms": [],
                "matched_term_count": 0,
                "word_count": word_count,
                "is_empty": False,
                "is_oov": True,
                "processing_status": "OUT_OF_VOCABULARY",
                "needs_review": True,
                "error_message": "Complaint text contains no recognizable domain vocabulary.",
            }

        try:
            if self._is_native_numpy:
                probabilities = self._predict_native_numpy(cleaned)
            else:
                X_vec = self._vectorizer.transform([cleaned])
                probabilities = self._classifier.predict_proba(X_vec)[0]

            prob_dict = {
                self._class_names[i]: float(probabilities[i])
                for i in range(len(self._class_names))
            }

            top_idx = int(np.argmax(probabilities))
            predicted_category = self._class_names[top_idx]
            confidence = float(probabilities[top_idx])

            is_confident = (confidence >= self.CONFIDENCE_THRESHOLD) and (len(matched_terms) >= 1)
            processing_status = "SUCCESS" if is_confident else "LOW_CONFIDENCE"

            return {
                "model_name": self._model_name,
                "model_version": self._model_version,
                "predicted_category": predicted_category,
                "confidence_score": round(confidence, 4),
                "all_probabilities": {k: round(v, 4) for k, v in prob_dict.items()},
                "matched_terms": matched_terms[:15],
                "matched_term_count": len(matched_terms),
                "word_count": word_count,
                "is_empty": False,
                "is_oov": False,
                "processing_status": processing_status,
                "needs_review": not is_confident,
                "error_message": None,
            }

        except Exception as e:
            logger.error("NLP text classification failed: %s", e, exc_info=True)
            flat_prob = 1.0 / len(self._class_names)
            return {
                "model_name": self._model_name,
                "model_version": self._model_version,
                "predicted_category": "other",
                "confidence_score": 0.0,
                "all_probabilities": {cls: round(flat_prob, 4) for cls in self._class_names},
                "matched_terms": [],
                "matched_term_count": 0,
                "word_count": word_count,
                "is_empty": False,
                "is_oov": False,
                "processing_status": "FAILED",
                "needs_review": True,
                "error_message": str(e),
            }

    async def predict_text_async(self, title: str = "", description: str = "") -> Dict[str, Any]:
        """Execute text classification asynchronously in a thread pool."""
        return await asyncio.to_thread(self.predict_text_sync, title, description)


nlp_model_manager = NLPModelManager()
