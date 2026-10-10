import io
import logging
import os
import uuid
from pathlib import Path
from typing import Optional, Tuple
from PIL import Image
from app.config import settings
from app.core.exceptions import BadRequestException

logger = logging.getLogger(__name__)

ALLOWED_FORMATS = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}


class StorageService:
    """Manages secure file uploads, validation, and storage routing (Supabase Storage or local fallback)."""

    def __init__(self):
        self.backend = settings.STORAGE_BACKEND
        self.bucket = settings.SUPABASE_STORAGE_BUCKET
        self.supabase_client = None

        if self.backend == "supabase" and settings.SUPABASE_URL and settings.SUPABASE_KEY:
            try:
                from supabase import create_client
                self.supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
                logger.info("Initialized Supabase Storage client for bucket: %s", self.bucket)
            except Exception as e:
                logger.warning("Could not initialize Supabase client; falling back to local storage: %s", e)
                self.backend = "local"

        if self.backend == "local":
            self.local_dir = Path(settings.LOCAL_STORAGE_DIR).resolve()
            self.local_dir.mkdir(parents=True, exist_ok=True)
            logger.info("Initialized local storage at: %s", self.local_dir)

    def validate_image(self, file_bytes: bytes, filename: str, content_type: str) -> str:
        """Validate file size, content-type, magic bytes, dimensions, and image decoding.
        
        Returns the canonical file extension (e.g., '.jpg').
        """
        # 1. Size check
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if len(file_bytes) > max_bytes:
            raise BadRequestException(
                f"File size exceeds maximum allowable limit of {settings.MAX_UPLOAD_SIZE_MB}MB",
                error_code="FILE_TOO_LARGE",
            )
        if len(file_bytes) < 100:
            raise BadRequestException("File payload is empty or corrupted", error_code="FILE_CORRUPT")

        # 2. Declared MIME check
        if content_type.lower() not in ALLOWED_MIME_TYPES:
            raise BadRequestException(
                f"Unsupported content type '{content_type}'. Allowed types: JPEG, PNG, WebP.",
                error_code="INVALID_MIME_TYPE",
            )

        # 3. Pillow image decode and structure verification
        try:
            # Verify magic bytes and structure
            stream = io.BytesIO(file_bytes)
            with Image.open(stream) as img:
                img.verify()

            # Re-open for format and dimension verification
            stream.seek(0)
            with Image.open(stream) as img:
                img_format = img.format
                width, height = img.size

                if img_format not in ALLOWED_FORMATS:
                    raise BadRequestException(
                        f"Image format '{img_format}' is not permitted. Only JPEG, PNG, and WebP are allowed.",
                        error_code="INVALID_IMAGE_FORMAT",
                    )

                # Defense against decompression bombs and invalid dimensions
                if width < 32 or height < 32:
                    raise BadRequestException("Image dimensions too small (min 32x32 required).", error_code="IMAGE_TOO_SMALL")
                if width > 8192 or height > 8192:
                    raise BadRequestException("Image dimensions exceed 8192x8192 limit.", error_code="IMAGE_TOO_LARGE")

                return ALLOWED_FORMATS[img_format]

        except BadRequestException:
            raise
        except Exception as e:
            logger.warning("Image verification failed: %s", e)
            raise BadRequestException("Uploaded file is not a valid or readable image.", error_code="INVALID_IMAGE_BYTES")

    async def save_image(
        self,
        file_bytes: bytes,
        prefix: str = "complaints",
        extension: str = ".jpg",
    ) -> str:
        """Save file to private storage with a cryptographically randomized path.
        
        Returns the internal storage path key.
        """
        file_id = str(uuid.uuid4())
        storage_path = f"{prefix}/{file_id}{extension}"

        if self.backend == "supabase" and self.supabase_client:
            try:
                # Upload to private Supabase Storage bucket
                content_type = "image/jpeg" if extension == ".jpg" else ("image/png" if extension == ".png" else "image/webp")
                self.supabase_client.storage.from_(self.bucket).upload(
                    path=storage_path,
                    file=file_bytes,
                    file_options={"content-type": content_type, "x-upsert": "false"},
                )
                logger.info("Successfully uploaded object to Supabase Storage: %s", storage_path)
                return storage_path
            except Exception as e:
                logger.error("Supabase Storage upload failed: %s. Storing locally.", e)
                # Fall through to local save to guarantee fail-open resilience

        # Local storage fallback
        dest_path = self.local_dir / prefix / f"{file_id}{extension}"
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        with open(dest_path, "wb") as f:
            f.write(file_bytes)
        logger.info("Saved image to local storage: %s", dest_path)
        return storage_path

    async def get_signed_url_or_token(self, storage_path: str, expiry_seconds: int = 3600) -> str:
        """Issue a short-lived URL or authenticated download path."""
        if self.backend == "supabase" and self.supabase_client:
            try:
                res = self.supabase_client.storage.from_(self.bucket).create_signed_url(
                    storage_path, expiry_seconds
                )
                if isinstance(res, dict) and "signedURL" in res:
                    return res["signedURL"]
                elif hasattr(res, "signed_url"):
                    return res.signed_url
            except Exception as e:
                logger.error("Failed to generate Supabase signed URL: %s", e)

        # For local storage, route through the authenticated backend files API
        return f"/api/v1/files/download?path={storage_path}"

    async def read_file_bytes(self, storage_path: str) -> Optional[bytes]:
        """Read file bytes directly from storage (for inference or authorized streaming)."""
        if self.backend == "supabase" and self.supabase_client:
            try:
                res = self.supabase_client.storage.from_(self.bucket).download(storage_path)
                return res
            except Exception as e:
                logger.error("Failed to download from Supabase Storage: %s", e)

        # Local read
        local_path = self.local_dir / storage_path
        if local_path.is_file():
            with open(local_path, "rb") as f:
                return f.read()
        return None


storage_service = StorageService()
