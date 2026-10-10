import io
import logging
import re
import uuid
from pathlib import Path
from typing import Optional
from PIL import Image
from app.config import settings
from app.core.exceptions import BadRequestException, StorageException

logger = logging.getLogger(__name__)

ALLOWED_FORMATS = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}


class StorageService:
    """Production-grade file storage service with strict backend separation:
    - Supabase Storage (production cloud object storage with private bucket)
    - Local storage (isolated filesystem storage for local development & testing)
    """

    def __init__(self):
        self.backend = settings.STORAGE_BACKEND
        self.bucket = settings.SUPABASE_STORAGE_BUCKET
        self.supabase_client = None
        self.local_dir = Path(settings.LOCAL_STORAGE_DIR).resolve()

        if self.backend == "supabase":
            if settings.SUPABASE_URL and settings.SUPABASE_KEY:
                try:
                    from supabase import create_client
                    self.supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
                    logger.info("Initialized Supabase Storage client for bucket: %s", self.bucket)
                except Exception as e:
                    logger.error("Failed to initialize Supabase client: %s", type(e).__name__)
            else:
                logger.warning(
                    "STORAGE_BACKEND is configured as 'supabase' but SUPABASE_URL or SUPABASE_KEY is missing."
                )
        elif self.backend == "local":
            self.local_dir.mkdir(parents=True, exist_ok=True)
            logger.info("Initialized local storage at: %s", self.local_dir)
        else:
            logger.warning("Unrecognized STORAGE_BACKEND: %s", self.backend)

        logger.info("StorageService initialized (configured_backend=%s)", self.backend)

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
                    raise BadRequestException(
                        "Image dimensions too small (min 32x32 required).",
                        error_code="IMAGE_TOO_SMALL",
                    )
                if width > 8192 or height > 8192:
                    raise BadRequestException(
                        "Image dimensions exceed 8192x8192 limit.",
                        error_code="IMAGE_TOO_LARGE",
                    )

                return ALLOWED_FORMATS[img_format]

        except BadRequestException:
            raise
        except Exception as e:
            logger.warning("Image verification failed: %s", type(e).__name__)
            raise BadRequestException(
                "Uploaded file is not a valid or readable image.",
                error_code="INVALID_IMAGE_BYTES",
            )

    async def save_image(
        self,
        file_bytes: bytes,
        prefix: str = "complaints",
        extension: str = ".jpg",
    ) -> str:
        """Save file to private storage with a cryptographically randomized path.
        
        Strict contracts:
        - If STORAGE_BACKEND=supabase: uploads to Supabase. On failure, raises StorageException without local fallback.
        - If STORAGE_BACKEND=local: saves under local_dir with path traversal protection.
        
        Returns the internal storage path key: e.g. 'complaints/<uuid>.jpg'.
        """
        # Guard prefix against path traversal
        if not re.match(r"^[a-zA-Z0-9_\-]+$", prefix):
            raise BadRequestException("Invalid storage prefix.", error_code="INVALID_STORAGE_PREFIX")

        if extension not in ALLOWED_FORMATS.values():
            raise BadRequestException("Invalid file extension.", error_code="INVALID_FILE_EXTENSION")

        file_id = str(uuid.uuid4())
        storage_path = f"{prefix}/{file_id}{extension}"

        if self.backend == "supabase":
            if not self.supabase_client:
                raise StorageException(
                    "Cloud storage client is not configured or unavailable.",
                    error_code="STORAGE_UNAVAILABLE",
                    status_code=502,
                )

            try:
                content_type = (
                    "image/jpeg"
                    if extension == ".jpg"
                    else ("image/png" if extension == ".png" else "image/webp")
                )
                res = self.supabase_client.storage.from_(self.bucket).upload(
                    path=storage_path,
                    file=file_bytes,
                    file_options={"content-type": content_type, "x-upsert": "false"},
                )
                if isinstance(res, dict) and res.get("error"):
                    raise Exception(f"Supabase storage error: {res['error']}")

                logger.info("Successfully uploaded object to Supabase Storage: %s", storage_path)
                return storage_path
            except Exception as e:
                logger.error(
                    "Supabase Storage upload failed for path %s: %s",
                    storage_path,
                    type(e).__name__,
                )
                # Strict contract: NEVER fall back to local storage in Supabase mode
                raise StorageException(
                    "Failed to upload image to cloud storage. Please try again.",
                    error_code="STORAGE_UPLOAD_FAILED",
                    status_code=502,
                ) from e

        elif self.backend == "local":
            dest_path = (self.local_dir / prefix / f"{file_id}{extension}").resolve()
            if not dest_path.is_relative_to(self.local_dir):
                raise BadRequestException(
                    "Invalid storage destination path.",
                    error_code="PATH_TRAVERSAL_DETECTED",
                )

            dest_path.parent.mkdir(parents=True, exist_ok=True)
            with open(dest_path, "wb") as f:
                f.write(file_bytes)
            logger.info("Saved image to local storage: %s", dest_path)
            return storage_path

        else:
            raise StorageException(
                f"Unsupported storage backend '{self.backend}'.",
                error_code="STORAGE_CONFIG_ERROR",
            )

    async def get_signed_url_or_token(
        self, storage_path: str, expiry_seconds: int = 3600, expires_in: Optional[int] = None
    ) -> str:
        """Issue a short-lived URL or authenticated download path."""
        effective_expiry = expires_in if expires_in is not None else expiry_seconds
        clean_path = storage_path.strip().replace("\\", "/")
        if clean_path.startswith("/") or ".." in clean_path:
            raise BadRequestException("Invalid storage path key.", error_code="PATH_TRAVERSAL_DETECTED")

        if self.backend == "supabase":
            if not self.supabase_client:
                raise StorageException(
                    "Cloud storage client is not configured or unavailable.",
                    error_code="STORAGE_UNAVAILABLE",
                    status_code=502,
                )

            try:
                res = self.supabase_client.storage.from_(self.bucket).create_signed_url(
                    clean_path, effective_expiry
                )
                signed_url = None
                if isinstance(res, dict):
                    signed_url = res.get("signedURL") or res.get("signedUrl")
                elif hasattr(res, "signed_url"):
                    signed_url = getattr(res, "signed_url")
                elif hasattr(res, "signedURL"):
                    signed_url = getattr(res, "signedURL")

                if signed_url:
                    return signed_url
                raise StorageException(
                    "Supabase signed URL generation returned empty response.",
                    error_code="SIGNED_URL_FAILED",
                )
            except StorageException:
                raise
            except Exception as e:
                logger.error(
                    "Failed to generate Supabase signed URL for %s: %s",
                    clean_path,
                    type(e).__name__,
                )
                raise StorageException(
                    "Unable to generate secure download link for cloud image.",
                    error_code="SIGNED_URL_FAILED",
                ) from e

        elif self.backend == "local":
            # For local storage, route through the authenticated backend files API
            return f"/api/v1/files/download?path={clean_path}"

        else:
            raise StorageException(
                f"Unsupported storage backend '{self.backend}'.",
                error_code="STORAGE_CONFIG_ERROR",
            )

    async def read_file_bytes(self, storage_path: str) -> Optional[bytes]:
        """Read file bytes directly from storage (for inference or authorized streaming).
        
        Strict contract:
        - If STORAGE_BACKEND=supabase: reads ONLY from Supabase Storage. Does NOT fall through to local files.
        - If STORAGE_BACKEND=local: reads ONLY from local storage directory.
        """
        clean_path = storage_path.strip().replace("\\", "/")
        if clean_path.startswith("/") or ".." in clean_path:
            raise BadRequestException("Invalid storage path key.", error_code="PATH_TRAVERSAL_DETECTED")

        if self.backend == "supabase":
            if not self.supabase_client:
                logger.warning("Cannot read file bytes: Supabase client is not initialized.")
                return None

            try:
                res = self.supabase_client.storage.from_(self.bucket).download(clean_path)
                return res
            except Exception as e:
                logger.warning(
                    "Supabase Storage download failed for path %s: %s",
                    clean_path,
                    type(e).__name__,
                )
                return None

        elif self.backend == "local":
            local_path = (self.local_dir / clean_path).resolve()
            if not local_path.is_relative_to(self.local_dir):
                raise BadRequestException(
                    "Invalid storage path key.", error_code="PATH_TRAVERSAL_DETECTED"
                )

            if local_path.is_file():
                with open(local_path, "rb") as f:
                    return f.read()
            return None

        return None

    async def delete_file(self, storage_path: str) -> bool:
        """Delete file from storage (used for compensating cleanup when DB operations fail)."""
        clean_path = storage_path.strip().replace("\\", "/")
        if clean_path.startswith("/") or ".." in clean_path:
            raise BadRequestException("Invalid storage path key.", error_code="PATH_TRAVERSAL_DETECTED")

        if self.backend == "supabase":
            if not self.supabase_client:
                logger.warning("Cannot delete file: Supabase client is not initialized.")
                return False

            try:
                self.supabase_client.storage.from_(self.bucket).remove([clean_path])
                logger.info("Successfully deleted cloud object: %s", clean_path)
                return True
            except Exception as e:
                logger.error(
                    "Failed to delete cloud object %s from Supabase Storage: %s",
                    clean_path,
                    type(e).__name__,
                )
                return False

        elif self.backend == "local":
            local_path = (self.local_dir / clean_path).resolve()
            if not local_path.is_relative_to(self.local_dir):
                return False

            if local_path.is_file():
                try:
                    local_path.unlink()
                    logger.info("Successfully deleted local file: %s", local_path)
                    return True
                except Exception as e:
                    logger.error("Failed to delete local file %s: %s", local_path, type(e).__name__)
                    return False
            return False

        return False


storage_service = StorageService()
