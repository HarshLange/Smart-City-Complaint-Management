import asyncio
import io
import logging
from typing import Any, Dict
from PIL import Image
import torch
from torchvision import transforms

from app.config import settings
from app.ml.model import model_manager
from app.ml.routing import resolve_department_code_for_category

logger = logging.getLogger(__name__)

# Exact audited preprocessing pipeline
eval_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    ),
])

# Maximum dimension limit before PyTorch conversion to prevent memory spikes on massive uploads
MAX_IMAGE_DIMENSION = 1920


def run_inference_sync(image_bytes: bytes) -> Dict[str, Any]:
    """
    Execute synchronous PyTorch inference on raw image bytes using
    the proposed ResNet18 + BiLSTM + Additive Attention neural network.
    Uses torch.inference_mode() for lowest CPU memory footprint.
    """
    try:
        # 1. Decode & validate image using Pillow
        with Image.open(io.BytesIO(image_bytes)) as pil_img:
            # Convert to RGB to ensure 3 channels (handles RGBA, palette, grayscale, CMYK)
            rgb_img = pil_img.convert("RGB")

            # Memory optimization: downscale giant images to max dimension before tensor transform
            w, h = rgb_img.size
            if max(w, h) > MAX_IMAGE_DIMENSION:
                rgb_img.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION), Image.Resampling.BILINEAR)

            # 2. Apply audited transforms
            input_tensor = eval_transform(rgb_img).unsqueeze(0)  # Shape: (1, 3, 224, 224)

        # 3. Obtain model singleton
        model = model_manager.get_model()

        # 4. Forward pass under inference_mode (avoids tracking autograd graph)
        with torch.inference_mode():
            logits = model(input_tensor)
            probabilities = torch.softmax(logits, dim=1).squeeze(0)

        # 5. Extract probabilities and predictions
        class_names = model_manager.class_names
        prob_dict = {
            class_names[i]: float(probabilities[i].item())
            for i in range(len(class_names))
        }

        top_idx = int(torch.argmax(probabilities).item())
        predicted_category = class_names[top_idx]
        confidence = float(probabilities[top_idx].item())

        # 6. Apply confidence threshold & deterministic department routing
        suggested_dept = resolve_department_code_for_category(predicted_category) or "INFRASTRUCTURE"
        is_confident = confidence >= settings.AI_CONFIDENCE_THRESHOLD
        processing_status = "SUCCESS" if is_confident else "LOW_CONFIDENCE"

        return {
            "model_name": model_manager.model_name,
            "model_version": model_manager.model_version,
            "predicted_category": predicted_category,
            "confidence_score": round(confidence, 4),
            "all_probabilities": {k: round(v, 4) for k, v in prob_dict.items()},
            "suggested_department_code": suggested_dept,
            "processing_status": processing_status,
            "needs_review": not is_confident,
            "error_message": None,
        }

    except Exception as e:
        logger.error("Inference execution failed: %s", e, exc_info=True)
        return {
            "model_name": model_manager.model_name,
            "model_version": model_manager.model_version,
            "predicted_category": "other",
            "confidence_score": 0.0,
            "all_probabilities": {},
            "suggested_department_code": "",
            "processing_status": "FAILED",
            "needs_review": True,
            "error_message": str(e),
        }


async def run_inference_async(image_bytes: bytes) -> Dict[str, Any]:
    """Execute inference asynchronously in a worker thread to keep the event loop non-blocking."""
    return await asyncio.to_thread(run_inference_sync, image_bytes)
