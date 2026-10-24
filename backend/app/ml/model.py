import gc
import json
import logging
import os
from pathlib import Path
from typing import Dict, List, Optional
import torch

from app.ml.architecture import ResNet18BiLSTMAdditiveAttention

logger = logging.getLogger(__name__)

# Directory paths
CURRENT_DIR = Path(__file__).resolve().parent
DEFAULT_WEIGHTS_DIR = CURRENT_DIR / "weights"


class ModelManager:
    """
    Thread-safe singleton managing the ResNet18 + BiLSTM + Additive Attention
    PyTorch model lifecycle.
    Optimized for CPU inference on memory-constrained production environments (Render 512MB RAM).
    """

    _instance: Optional["ModelManager"] = None
    _model: Optional[torch.nn.Module] = None
    _metadata: Optional[Dict] = None
    _model_name: str = "ResNet18 + BiLSTM + Attention"
    _model_version: str = "TP100-epoch47"
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

    def __new__(cls) -> "ModelManager":
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
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
    def metadata(self) -> Optional[Dict]:
        return self._metadata

    def get_model(self) -> torch.nn.Module:
        if self._model is None:
            self.load_model()
        return self._model

    def load_model(
        self,
        model_path: Optional[str] = None,
        metadata_path: Optional[str] = None,
    ) -> None:
        """
        Load trained ResNet18 + BiLSTM + Additive Attention model into memory.
        Enforces single-worker, thread-optimized evaluation mode.
        """
        # Configure PyTorch CPU thread count to 1 to minimize context-switch overhead on Render/Cloud Run 1 vCPU
        try:
            torch.set_num_threads(1)
        except Exception:
            pass

        # Candidate paths for weights (clean inference checkpoint preferred for low RAM)
        candidate_paths: List[Path] = []
        if model_path:
            candidate_paths.append(Path(model_path))
        candidate_paths.extend([
            DEFAULT_WEIGHTS_DIR / "best_resnet18_bilstm_attention_clean.pt",
            DEFAULT_WEIGHTS_DIR / "best_resnet18_bilstm_attention.pt",
            DEFAULT_WEIGHTS_DIR / "best_model.pt",
            Path("app/ml/weights/best_resnet18_bilstm_attention_clean.pt"),
            Path("app/ml/weights/best_resnet18_bilstm_attention.pt"),
            Path("backend/app/ml/weights/best_resnet18_bilstm_attention_clean.pt"),
            Path("backend/app/ml/weights/best_resnet18_bilstm_attention.pt"),
        ])

        resolved_model_path: Optional[Path] = None
        for p in candidate_paths:
            if p.is_file():
                resolved_model_path = p
                break

        if not resolved_model_path:
            raise FileNotFoundError(
                f"Model checkpoint not found in any expected location: {[str(p) for p in candidate_paths]}"
            )

        # Load metadata if available
        candidate_meta = [
            DEFAULT_WEIGHTS_DIR / "model_metadata.json",
            Path("app/ml/weights/model_metadata.json"),
            Path("backend/app/ml/weights/model_metadata.json"),
        ]
        if metadata_path:
            candidate_meta.insert(0, Path(metadata_path))

        for m in candidate_meta:
            if m.is_file():
                try:
                    with open(m, "r", encoding="utf-8") as f:
                        self._metadata = json.load(f)
                        if "class_names" in self._metadata:
                            self._class_names = self._metadata["class_names"]
                        if "class_to_idx" in self._metadata:
                            self._class_to_idx = self._metadata["class_to_idx"]
                        if "display_name" in self._metadata:
                            self._model_name = self._metadata["display_name"]
                        if "model_version" in self._metadata:
                            self._model_version = self._metadata["model_version"]
                except Exception as e:
                    logger.warning("Failed to load model metadata: %s", e)
                break

        logger.info(
            "Initializing %s architecture (classes=%d)...",
            self._model_name,
            len(self._class_names),
        )

        model = ResNet18BiLSTMAdditiveAttention(
            num_classes=len(self._class_names),
            lstm_hidden_size=256,
            dropout=0.3,
        )

        logger.info("Loading checkpoint weights from %s", resolved_model_path)
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

        # Strict load to guarantee 100% parameter topology match
        model.load_state_dict(state_dict, strict=True)
        model.eval()

        # Freeze all gradients for zero backward pass memory overhead
        for param in model.parameters():
            param.requires_grad = False

        self._model = model

        # Immediately free temporary loading checkpoint objects
        del checkpoint
        del state_dict
        gc.collect()

        logger.info(
            "%s loaded successfully into evaluation mode (12,888,646 parameters).",
            self._model_name,
        )


model_manager = ModelManager()
