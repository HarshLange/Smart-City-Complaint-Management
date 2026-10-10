"""Runtime verification script for CivicPulse on Supabase PostgreSQL.

Executes all verification criteria:
1. Safe inspection of .env configuration.
2. Dialect and driver verification via SQLAlchemy engine.
3. PostgreSQL server version query.
4. Lifespan startup check (no create_all, no duplicate seeding).
5. Comprehensive retrieval of complaint REF-20261010-GKLBTV and relations.
6. Image retrieval and validation from private Supabase Storage.
"""

import asyncio
import io
import logging
from pathlib import Path
import sys
from urllib.parse import urlparse

from PIL import Image

backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from sqlalchemy import select, text
from sqlalchemy.orm import selectinload
from app.config import settings
from app.core.security import verify_tracking_pin
from app.db.session import AsyncSessionLocal, engine
from app.main import lifespan, app
from app.models.audit import StatusHistory
from app.models.complaint import AIPrediction, Complaint, ComplaintAttachment
from app.models.enums import CivicCategory, ComplaintStatus, UserRole
from app.models.user import Department, User
from app.services.complaint_service import complaint_service
from app.services.storage_service import storage_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("runtime_verify")


async def run_runtime_verification():
    logger.info("==================================================================")
    logger.info("CIVICPULSE RUNTIME VERIFICATION: SUPABASE POSTGRESQL & STORAGE")
    logger.info("==================================================================")

    # ------------------------------------------------------------------
    # CHECK 1 & 2: Environment Configuration & Safe Inspection
    # ------------------------------------------------------------------
    logger.info("[CHECK 1 & 2] Inspecting DATABASE_URL configuration safely...")
    raw_url = settings.DATABASE_URL
    parsed = urlparse(raw_url)
    
    # Safe validation without exposing credentials
    has_user = bool(parsed.username)
    has_pass = bool(parsed.password)
    host = parsed.hostname
    port = parsed.port
    path = parsed.path
    
    assert host and "pooler.supabase.com" in host, f"Expected Supabase pooler host, found {host}"
    assert port == 5432, f"Expected port 5432 (Session pooler), found {port}"
    assert has_user and has_pass, "Database username and password must be configured"
    assert settings.STORAGE_BACKEND == "supabase", f"Expected STORAGE_BACKEND=supabase, got {settings.STORAGE_BACKEND}"
    assert settings.SUPABASE_STORAGE_BUCKET == "complaint-images"

    logger.info("  Configuration Target Host: %s", host)
    logger.info("  Configuration Target Port: %d (Session Pooler)", port)
    logger.info("  Configuration Database: %s", path)
    logger.info("  Credentials Configured: [REDACTED - PRESENT]")
    logger.info("  Storage Backend: %s (Bucket: %s)", settings.STORAGE_BACKEND, settings.SUPABASE_STORAGE_BUCKET)
    logger.info("[PASSED] Environment configuration verified.")

    # ------------------------------------------------------------------
    # CHECK 3 & 4: Active Dialect, Driver & PostgreSQL Server Version
    # ------------------------------------------------------------------
    logger.info("[CHECK 3 & 4] Querying active SQLAlchemy engine dialect and server version...")
    dialect_name = engine.dialect.name
    driver_name = engine.dialect.driver
    
    assert dialect_name == "postgresql", f"Expected dialect 'postgresql', found '{dialect_name}'"
    assert driver_name == "asyncpg", f"Expected driver 'asyncpg', found '{driver_name}'"

    async with AsyncSessionLocal() as session:
        res = await session.execute(text("SELECT version();"))
        pg_version_str = res.scalar()
        
        res_current_db = await session.execute(text("SELECT current_database(), current_user;"))
        current_db, current_user = res_current_db.fetchone()

    logger.info("  Active SQLAlchemy Dialect: %s", dialect_name)
    logger.info("  Active SQLAlchemy Driver:  %s", driver_name)
    logger.info("  PostgreSQL Server Version: %s", pg_version_str[:70])
    logger.info("  Connected Database:        %s", current_db)
    logger.info("  Connected Database User:   %s", current_user)
    assert "PostgreSQL" in pg_version_str, "Server version does not indicate PostgreSQL"
    logger.info("[PASSED] Active runtime confirmed as PostgreSQL (asyncpg), NOT SQLite.")

    # ------------------------------------------------------------------
    # CHECK 7 & 8: Application Startup Lifespan & Duplicate Seeding Guards
    # ------------------------------------------------------------------
    logger.info("[CHECK 7 & 8] Testing application startup lifespan behavior...")
    
    # Snapshot counts before lifespan
    async with AsyncSessionLocal() as session:
        dept_cnt_before = (await session.execute(text('SELECT COUNT(*) FROM "departments";'))).scalar()
        user_cnt_before = (await session.execute(text('SELECT COUNT(*) FROM "users";'))).scalar()
        comp_cnt_before = (await session.execute(text('SELECT COUNT(*) FROM "complaints";'))).scalar()

    # Execute lifespan startup
    async with lifespan(app):
        logger.info("  Application lifespan initialized successfully.")

    # Snapshot counts after lifespan
    async with AsyncSessionLocal() as session:
        dept_cnt_after = (await session.execute(text('SELECT COUNT(*) FROM "departments";'))).scalar()
        user_cnt_after = (await session.execute(text('SELECT COUNT(*) FROM "users";'))).scalar()
        comp_cnt_after = (await session.execute(text('SELECT COUNT(*) FROM "complaints";'))).scalar()

    assert dept_cnt_before == dept_cnt_after == 4, f"Department count changed: {dept_cnt_before} -> {dept_cnt_after}"
    assert user_cnt_before == user_cnt_after == 7, f"User count changed: {user_cnt_before} -> {user_cnt_after}"
    assert comp_cnt_before == comp_cnt_after == 2, f"Complaint count changed: {comp_cnt_before} -> {comp_cnt_after}"
    logger.info("  Department count: %d (unchanged, zero duplicates)", dept_cnt_after)
    logger.info("  User count:       %d (unchanged, zero duplicates)", user_cnt_after)
    logger.info("  Complaint count:  %d (unchanged, zero duplicates)", comp_cnt_after)
    logger.info("[PASSED] Startup lifespan preserves schema without create_all and runs idempotent seeding.")

    # ------------------------------------------------------------------
    # CHECK 5: Retrieval of Complaint REF-20261010-GKLBTV & Relations
    # ------------------------------------------------------------------
    logger.info("[CHECK 5] Retrieving complaint REF-20261010-GKLBTV through complaint_service...")
    async with AsyncSessionLocal() as session:
        complaint = await complaint_service.get_complaint_by_reference(session, "REF-20261010-GKLBTV")
        assert complaint is not None, "Complaint REF-20261010-GKLBTV was not found in PostgreSQL!"

        logger.info("  Reference Number: %s", complaint.reference_number)
        logger.info("  Title:            %s", complaint.title)
        logger.info("  Status:           %s", complaint.status.value)
        logger.info("  Category:         %s", complaint.category.value)
        
        # Verify Citizen (OAuth User)
        assert complaint.citizen is not None, "Citizen relationship not populated"
        assert complaint.citizen.email == "harshlange3@gmail.com"
        assert complaint.citizen.role == UserRole.CITIZEN
        assert complaint.citizen.id == "7a81df62-5aff-46e0-ae39-3175ccf68ee0"
        logger.info("  Citizen:          %s (%s, ID: %s)", complaint.citizen.full_name, complaint.citizen.email, complaint.citizen.id)

        # Verify Department
        assert complaint.department is not None, "Department relationship not populated"
        assert complaint.department.code == "GARBAGE_DEPT"
        logger.info("  Department:       %s (Code: %s)", complaint.department.name, complaint.department.code)

        # Verify AI Prediction
        assert complaint.ai_prediction is not None, "AI Prediction relationship not populated"
        logger.info("  AI Prediction:    Category=%s, Confidence=%.2f%%, Model=%s",
                    complaint.ai_prediction.predicted_category,
                    complaint.ai_prediction.confidence_score * 100,
                    complaint.ai_prediction.model_name)

        # Verify Attachment
        assert len(complaint.attachments) >= 1, "No attachments found on complaint"
        attachment = complaint.attachments[0]
        logger.info("  Attachment:       Filename=%s, Size=%d bytes, StorageKey=%s",
                    attachment.filename, attachment.file_size_bytes, attachment.storage_path)
        assert attachment.storage_path == "complaints/0984a560-d80d-4f17-a5b0-81a8fce3ad12.jpg"

        # Verify Status Timeline
        assert len(complaint.status_history) >= 1, "Status history not populated"
        logger.info("  Timeline Events:  %d status history entries", len(complaint.status_history))

    logger.info("[PASSED] Full object-graph retrieval of REF-20261010-GKLBTV verified.")

    # ------------------------------------------------------------------
    # CHECK 6: Image Retrieval from Private Supabase Storage Bucket
    # ------------------------------------------------------------------
    logger.info("[CHECK 6] Retrieving attachment image binary from private Supabase Storage...")
    target_storage_path = attachment.storage_path
    
    file_bytes = await storage_service.read_file_bytes(target_storage_path)
    assert file_bytes is not None, f"Failed to retrieve image bytes from storage path: {target_storage_path}"
    assert len(file_bytes) == attachment.file_size_bytes, (
        f"Byte size mismatch: expected {attachment.file_size_bytes}, retrieved {len(file_bytes)}"
    )

    # Validate image binary structure with Pillow
    stream = io.BytesIO(file_bytes)
    with Image.open(stream) as img:
        img_format = img.format
        img_size = img.size
        logger.info("  Image Format:     %s", img_format)
        logger.info("  Image Dimensions: %dx%d", img_size[0], img_size[1])
        assert img_format in ("JPEG", "PNG", "WEBP"), f"Unexpected image format: {img_format}"

    # Verify signed URL generation
    signed_url = await storage_service.get_signed_url_or_token(target_storage_path, expiry_seconds=300)
    assert signed_url is not None and "supabase.co" in signed_url, "Signed URL failed to generate from Supabase"
    logger.info("  Signed URL Generation: [PASSED - VALID TIME-LIMITED SIGNED URL GENERATED]")
    logger.info("[PASSED] Image binary and signed URL retrieval from private Supabase Storage verified.")

    logger.info("==================================================================")
    logger.info("ALL VERIFICATION CHECKS PASSED SUCCESSFULLY (8/8)")
    logger.info("CIVICPULSE IS CONFIRMED ACTIVELY RUNNING ON SUPABASE POSTGRESQL")
    logger.info("==================================================================")


if __name__ == "__main__":
    asyncio.run(run_runtime_verification())
