import io
import logging
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch
from PIL import Image
import pytest
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from app.models.user import User
from app.config import settings
from app.core.exceptions import BadRequestException, StorageException
from app.services.complaint_service import complaint_service
from app.services.storage_service import StorageService, storage_service


def make_valid_image_bytes(format_name: str = "JPEG", size: tuple = (100, 100)) -> bytes:
    """Helper to generate valid image bytes for tests."""
    img = Image.new("RGB", size, color=(73, 109, 137))
    buf = io.BytesIO()
    img.save(buf, format=format_name)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Test 1: Supabase client initializes with valid config
# ---------------------------------------------------------------------------
def test_supabase_client_initialization_with_valid_config(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "STORAGE_BACKEND", "supabase")
    monkeypatch.setattr(settings, "SUPABASE_URL", "https://mockproject.supabase.co")
    monkeypatch.setattr(settings, "SUPABASE_KEY", "mock-anon-or-service-key")
    monkeypatch.setattr(settings, "SUPABASE_STORAGE_BUCKET", "complaint-images")
    monkeypatch.setattr(settings, "LOCAL_STORAGE_DIR", str(tmp_path))

    with patch("supabase.create_client") as mock_create_client:
        mock_client = MagicMock()
        mock_create_client.return_value = mock_client

        svc = StorageService()
        assert svc.backend == "supabase"
        assert svc.bucket == "complaint-images"
        assert svc.supabase_client == mock_client
        mock_create_client.assert_called_once_with(
            "https://mockproject.supabase.co", "mock-anon-or-service-key"
        )


# ---------------------------------------------------------------------------
# Test 2: Successful cloud upload returns expected object path
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_successful_cloud_upload_returns_expected_path():
    valid_bytes = make_valid_image_bytes("JPEG")
    svc = StorageService()
    svc.backend = "supabase"
    svc.bucket = "complaint-images"

    mock_client = MagicMock()
    mock_bucket_proxy = MagicMock()
    mock_bucket_proxy.upload.return_value = {"Key": "complaints/test.jpg"}
    mock_client.storage.from_.return_value = mock_bucket_proxy
    svc.supabase_client = mock_client

    result_path = await svc.save_image(valid_bytes, prefix="complaints", extension=".jpg")

    assert result_path.startswith("complaints/")
    assert result_path.endswith(".jpg")
    mock_client.storage.from_.assert_called_with("complaint-images")
    mock_bucket_proxy.upload.assert_called_once()
    call_args = mock_bucket_proxy.upload.call_args
    assert call_args.kwargs["path"] == result_path
    assert call_args.kwargs["file"] == valid_bytes
    assert call_args.kwargs["file_options"]["content-type"] == "image/jpeg"


# ---------------------------------------------------------------------------
# Test 3: Supabase upload failure raises controlled StorageException
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_supabase_upload_failure_raises_storage_exception():
    valid_bytes = make_valid_image_bytes("JPEG")
    svc = StorageService()
    svc.backend = "supabase"
    svc.bucket = "complaint-images"

    mock_client = MagicMock()
    mock_bucket_proxy = MagicMock()
    mock_bucket_proxy.upload.side_effect = Exception("Supabase Storage timeout: connection refused")
    mock_client.storage.from_.return_value = mock_bucket_proxy
    svc.supabase_client = mock_client

    with pytest.raises(StorageException) as exc_info:
        await svc.save_image(valid_bytes, prefix="complaints", extension=".jpg")

    assert exc_info.value.status_code == 502
    assert exc_info.value.error_code == "STORAGE_UPLOAD_FAILED"


# ---------------------------------------------------------------------------
# Test 4: Failed cloud uploads do NOT create local fallback files
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_failed_cloud_upload_does_not_create_local_fallback(tmp_path):
    valid_bytes = make_valid_image_bytes("JPEG")
    svc = StorageService()
    svc.backend = "supabase"
    svc.bucket = "complaint-images"
    svc.local_dir = tmp_path

    mock_client = MagicMock()
    mock_bucket_proxy = MagicMock()
    mock_bucket_proxy.upload.side_effect = Exception("Supabase network error")
    mock_client.storage.from_.return_value = mock_bucket_proxy
    svc.supabase_client = mock_client

    with pytest.raises(StorageException):
        await svc.save_image(valid_bytes, prefix="complaints", extension=".jpg")

    # Strict contract: verify local directory remains completely empty
    files_on_disk = list(tmp_path.rglob("*"))
    assert len(files_on_disk) == 0, f"Found unexpected fallback files: {files_on_disk}"


# ---------------------------------------------------------------------------
# Test 5: Local mode still saves and reads files correctly
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_local_mode_save_and_read(tmp_path):
    valid_bytes = make_valid_image_bytes("PNG")
    svc = StorageService()
    svc.backend = "local"
    svc.local_dir = tmp_path

    # Save
    saved_path = await svc.save_image(valid_bytes, prefix="evidence", extension=".png")
    assert saved_path.startswith("evidence/")
    assert saved_path.endswith(".png")

    # Confirm file exists on disk
    full_disk_path = tmp_path / saved_path
    assert full_disk_path.is_file()
    assert full_disk_path.read_bytes() == valid_bytes

    # Read
    read_bytes = await svc.read_file_bytes(saved_path)
    assert read_bytes == valid_bytes

    # Delete
    deleted = await svc.delete_file(saved_path)
    assert deleted is True
    assert not full_disk_path.exists()


# ---------------------------------------------------------------------------
# Test 6: Invalid image bytes are rejected
# ---------------------------------------------------------------------------
def test_invalid_image_bytes_rejected():
    corrupted_bytes = b"NOT_AN_IMAGE_MAGIC_BYTES_CORRUPTED" * 10
    svc = StorageService()

    with pytest.raises(BadRequestException) as exc_info:
        svc.validate_image(corrupted_bytes, "photo.jpg", "image/jpeg")

    assert exc_info.value.error_code == "INVALID_IMAGE_BYTES"


# ---------------------------------------------------------------------------
# Test 7: Unsupported MIME types and image formats rejected
# ---------------------------------------------------------------------------
def test_unsupported_mime_types_and_formats_rejected():
    svc = StorageService()

    # Unsupported MIME
    valid_jpeg = make_valid_image_bytes("JPEG")
    with pytest.raises(BadRequestException) as exc_info:
        svc.validate_image(valid_jpeg, "doc.pdf", "application/pdf")
    assert exc_info.value.error_code == "INVALID_MIME_TYPE"

    # Unsupported format (e.g. GIF)
    gif_img = Image.new("RGB", (100, 100))
    gif_buf = io.BytesIO()
    gif_img.save(gif_buf, format="GIF")
    gif_bytes = gif_buf.getvalue()

    with pytest.raises(BadRequestException) as exc_info:
        svc.validate_image(gif_bytes, "anim.gif", "image/gif")
    assert exc_info.value.error_code in ("INVALID_MIME_TYPE", "INVALID_IMAGE_FORMAT")


# ---------------------------------------------------------------------------
# Test 8: Oversized images rejected (>5MB)
# ---------------------------------------------------------------------------
def test_oversized_images_rejected(monkeypatch):
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_MB", 5)
    oversized_bytes = b"X" * (5 * 1024 * 1024 + 1024)  # > 5MB
    svc = StorageService()

    with pytest.raises(BadRequestException) as exc_info:
        svc.validate_image(oversized_bytes, "large.jpg", "image/jpeg")

    assert exc_info.value.error_code == "FILE_TOO_LARGE"


# ---------------------------------------------------------------------------
# Test 9: Signed URL generation uses configured bucket and expiry
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_signed_url_generation_uses_configured_bucket_and_expiry():
    svc = StorageService()
    svc.backend = "supabase"
    svc.bucket = "complaint-images"

    expected_signed_url = (
        "https://mockproject.supabase.co/storage/v1/object/sign/complaint-images/complaints/test.jpg?token=abc"
    )
    mock_client = MagicMock()
    mock_bucket_proxy = MagicMock()
    mock_bucket_proxy.create_signed_url.return_value = {"signedURL": expected_signed_url}
    mock_client.storage.from_.return_value = mock_bucket_proxy
    svc.supabase_client = mock_client

    url = await svc.get_signed_url_or_token("complaints/test.jpg", expiry_seconds=900)

    assert url == expected_signed_url
    mock_client.storage.from_.assert_called_with("complaint-images")
    mock_bucket_proxy.create_signed_url.assert_called_once_with("complaints/test.jpg", 900)


# ---------------------------------------------------------------------------
# Test 10: Missing cloud objects return None without falling back to local files
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_missing_cloud_objects_return_none_without_local_fallback(tmp_path):
    svc = StorageService()
    svc.backend = "supabase"
    svc.bucket = "complaint-images"
    svc.local_dir = tmp_path

    # Place a local file with the exact same name
    local_subfolder = tmp_path / "complaints"
    local_subfolder.mkdir(parents=True, exist_ok=True)
    local_file = local_subfolder / "missing.jpg"
    local_file.write_bytes(b"LOCAL_DATA_SHOULD_NEVER_BE_READ")

    # Mock Supabase download to raise object not found
    mock_client = MagicMock()
    mock_bucket_proxy = MagicMock()
    mock_bucket_proxy.download.side_effect = Exception("Object not found in bucket")
    mock_client.storage.from_.return_value = mock_bucket_proxy
    svc.supabase_client = mock_client

    result = await svc.read_file_bytes("complaints/missing.jpg")

    # Strict contract: Returns None and MUST NOT read local_file
    assert result is None


# ---------------------------------------------------------------------------
# Test 11: Path traversal attempts rejected
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_path_traversal_attempts_rejected():
    svc = StorageService()
    valid_bytes = make_valid_image_bytes("JPEG")

    # Path traversal in prefix
    with pytest.raises(BadRequestException) as exc1:
        await svc.save_image(valid_bytes, prefix="../traversal", extension=".jpg")
    assert exc1.value.error_code == "INVALID_STORAGE_PREFIX"

    # Path traversal in read_file_bytes
    with pytest.raises(BadRequestException) as exc2:
        await svc.read_file_bytes("../secret.env")
    assert exc2.value.error_code == "PATH_TRAVERSAL_DETECTED"

    with pytest.raises(BadRequestException) as exc3:
        await svc.read_file_bytes("/etc/passwd")
    assert exc3.value.error_code == "PATH_TRAVERSAL_DETECTED"

    # Path traversal in delete_file
    with pytest.raises(BadRequestException) as exc4:
        await svc.delete_file("../../windows/system32")
    assert exc4.value.error_code == "PATH_TRAVERSAL_DETECTED"

    # Path traversal in get_signed_url_or_token
    with pytest.raises(BadRequestException) as exc5:
        await svc.get_signed_url_or_token("../../../etc/shadow")
    assert exc5.value.error_code == "PATH_TRAVERSAL_DETECTED"


# ---------------------------------------------------------------------------
# Test 12: Database failure after upload triggers safe compensating cleanup
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_db_failure_after_upload_triggers_safe_cleanup(db_session):
    user_res = await db_session.execute(select(User).where(User.email == "citizen@smartcity.gov"))
    citizen = user_res.scalar_one()
    valid_bytes = make_valid_image_bytes("JPEG")

    # Patch db_session.commit to simulate database failure
    with patch.object(
        db_session, "commit", side_effect=SQLAlchemyError("Simulated DB connection drop")
    ), patch.object(
        storage_service, "save_image", return_value="complaints/orphaned-uuid-123.jpg"
    ), patch.object(
        storage_service, "delete_file", new_callable=AsyncMock
    ) as mock_delete:
        with pytest.raises(SQLAlchemyError):
            await complaint_service.create_complaint(
                db=db_session,
                title="Pothole issue",
                description="Needs urgent repair on 5th street",
                image_bytes=valid_bytes,
                filename="pothole.jpg",
                content_type="image/jpeg",
                user_id=citizen.id,
            )

        # Confirm compensating cleanup was triggered for the exact uploaded path
        mock_delete.assert_awaited_once_with("complaints/orphaned-uuid-123.jpg")


# ---------------------------------------------------------------------------
# Test 13: Cleanup failure is logged without masking original error
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_cleanup_failure_is_logged_without_masking_original_error(db_session, caplog):
    user_res = await db_session.execute(select(User).where(User.email == "citizen@smartcity.gov"))
    citizen = user_res.scalar_one()
    valid_bytes = make_valid_image_bytes("JPEG")
    original_db_error = SQLAlchemyError("Database foreign key constraint violation")

    with patch.object(
        db_session, "commit", side_effect=original_db_error
    ), patch.object(
        storage_service, "save_image", return_value="complaints/cleanup-fail-uuid.jpg"
    ), patch.object(
        storage_service, "delete_file", side_effect=Exception("Storage network failure during cleanup")
    ):
        with caplog.at_level(logging.ERROR):
            with pytest.raises(SQLAlchemyError) as exc_info:
                await complaint_service.create_complaint(
                    db=db_session,
                    title="Water leakage",
                    description="Main pipe burst causing street flooding",
                    image_bytes=valid_bytes,
                    filename="leak.jpg",
                    content_type="image/jpeg",
                    user_id=citizen.id,
                )

            # Original error is preserved and raised to caller
            assert exc_info.value is original_db_error

            # Cleanup error is logged without masking the original exception
            assert any(
                "Compensating storage cleanup failed" in record.message
                for record in caplog.records
            )
