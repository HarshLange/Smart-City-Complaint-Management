import json
import logging
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import torch
from torchvision import models

logger = logging.getLogger(__name__)

# Fallback paths
CURRENT_DIR = Path(__file__).resolve().parent
DEFAULT_WEIGHTS_DIR = CURRENT_DIR / "weights"


class ModelManager:
    """Thread-safe singleton managing the EfficientNetV2-S PyTorch model lifecycle."""

    _instance: Optional["ModelManager"] = None
    _model: Optional[torch.nn.Module] = None
    _metadata: Optional[Dict] = None
    _class_names: List[str] = [
        "damaged_road",
        "garbage",
        "pothole",
        "streetlight_failure",
        "water_leak",
    ]

    def __new__(cls) -> "ModelManager":
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
        return cls._instance

    @property
    def class_names(self) -> List[str]:
        return self._class_names

    def get_model(self) -> torch.nn.Module:
        if self._model is None:
            self.load_model()
        return self._model

    def load_model(self, model_path: Optional[str] = None, metadata_path: Optional[str] = None) -> None:
        """Load trained EfficientNetV2-S model into memory."""
        # Resolve model path
        candidate_paths = []
        if model_path:
            candidate_paths.append(Path(model_path))
        candidate_paths.extend([
            DEFAULT_WEIGHTS_DIR / "best_model.pt",
            Path("app/ml/weights/best_model.pt"),
            Path("backend/app/ml/weights/best_model.pt"),
        ])

        resolved_model_path: Optional[Path] = None
        for p in candidate_paths:
            if p.is_file():
                resolved_model_path = p
                break

        if not resolved_model_path:
            raise FileNotFoundError(
                f"Trained model checkpoint not found in any expected location: {[str(p) for p in candidate_paths]}"
            )

        # Load metadata if available
        candidate_meta = [
            DEFAULT_WEIGHTS_DIR / "model_metadata.json",
            Path("app/ml/weights/model_metadata.json"),
            Path("backend/app/ml/weights/model_metadata.json"),
        ]
        for m in candidate_meta:
            if m.is_file():
                try:
                    with open(m, "r", encoding="utf-8") as f:
                        self._metadata = json.load(f)
                        if "class_names" in self._metadata:
                            self._class_names = self._metadata["class_names"]
                except Exception as e:
                    logger.warning("Failed to load model metadata: %s", e)
                break

        logger.info("Initializing EfficientNetV2-S architecture...")
        model = models.efficientnet_v2_s(weights=None)
        in_features = model.classifier[1].in_features
        model.classifier[1] = torch.nn.Linear(in_features, len(self._class_names))

        logger.info("Loading weights from %s", resolved_model_path)
        checkpoint = torch.load(
            resolved_model_path,
            map_location="cpu",
            weights_only=False,
        )

        state_dict = (
            checkpoint["model_state_dict"]
            if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint
            else checkpoint
        )

        model.load_state_dict(state_dict)
        model.eval()

        for param in model.parameters():
            param.requires_grad = False

        self._model = model
        logger.info("EfficientNetV2-S loaded successfully into evaluation mode.")


model_manager = ModelManager()
