"""Live integration verification suite executed directly against Supabase PostgreSQL."""

import asyncio
from datetime import datetime, timezone
import logging
from pathlib import Path
import sys

backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from app.core.security import verify_tracking_pin
from app.db.session import AsyncSessionLocal, engine
from app.models.audit import AuditEvent, StatusHistory
from app.models.complaint import AIPrediction, Complaint, ComplaintAttachment
from app.models.enums import AuditActionType, CivicCategory, ComplaintStatus, UserRole
from app.models.user import Department, User

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("pg_verify")


async def run_live_postgresql_tests():
    logger.info("=================================================================")
    logger.info("STARTING LIVE SUPABASE POSTGRESQL INTEGRATION VERIFICATION")
    logger.info("=================================================================")

    async with AsyncSessionLocal() as session:
        # TEST 1: Connectivity & Postgres Version
        logger.info("[TEST 1] Verifying PostgreSQL database version & current schema...")
        res_ver = await session.execute(text("SELECT version();"))
        pg_ver = res_ver.scalar()
        logger.info("Connected to PostgreSQL engine: %s", pg_ver[:60])

        res_schema = await session.execute(text("SELECT current_schema();"))
        curr_schema = res_schema.scalar()
        assert curr_schema == "public", f"Expected public schema, got {curr_schema}"
        logger.info("[PASSED] Connectivity and schema confirmed (schema: %s)", curr_schema)

        # TEST 2: Department Isolation & Inventory
        logger.info("[TEST 2] Verifying department records and codes...")
        res_dept = await session.execute(select(Department).order_by(Department.code))
        depts = res_dept.scalars().all()
        assert len(depts) == 4, f"Expected 4 departments, found {len(depts)}"
        dept_codes = [d.code for d in depts]
        assert "ROAD_AUTHORITY" in dept_codes
        assert "GARBAGE_DEPT" in dept_codes
        assert "INFRASTRUCTURE" in dept_codes
        assert "WATER_DEPT" in dept_codes
        logger.info("[PASSED] All 4 departments verified: %s", dept_codes)

        # TEST 3: User Accounts & RBAC Roles
        logger.info("[TEST 3] Verifying user accounts, roles, and Google OAuth profile...")
        res_users = await session.execute(select(User).options(selectinload(User.department)))
        users = res_users.scalars().all()
        assert len(users) == 7, f"Expected 7 users, found {len(users)}"
        
        admins = [u for u in users if u.role == UserRole.ADMIN]
        officers = [u for u in users if u.role == UserRole.OFFICER]
        citizens = [u for u in users if u.role == UserRole.CITIZEN]
        assert len(admins) == 1, "Expected 1 admin"
        assert len(officers) == 4, "Expected 4 officers"
        assert len(citizens) == 2, "Expected 2 citizens"

        # Verify Google OAuth citizen user
        oauth_user = next((u for u in citizens if u.email == "harshlange3@gmail.com"), None)
        assert oauth_user is not None, "Google OAuth citizen user harshlange3@gmail.com missing!"
        assert oauth_user.id == "7a81df62-5aff-46e0-ae39-3175ccf68ee0"
        logger.info("[PASSED] User roles verified (1 Admin, 4 Officers, 2 Citizens including Google OAuth user)")

        # TEST 4: Complaints & Eager Relationships
        logger.info("[TEST 4] Verifying complaint records, AI predictions, and storage attachments...")
        res_complaints = await session.execute(
            select(Complaint)
            .options(
                selectinload(Complaint.citizen),
                selectinload(Complaint.department),
                selectinload(Complaint.attachments),
                selectinload(Complaint.ai_prediction),
                selectinload(Complaint.status_history),
            )
            .order_by(Complaint.created_at)
        )
        complaints = res_complaints.scalars().all()
        assert len(complaints) == 2, f"Expected 2 complaints, found {len(complaints)}"

        for c in complaints:
            assert c.reference_number.startswith("REF-")
            assert c.status in ComplaintStatus
            assert c.category in CivicCategory
            assert len(c.attachments) >= 1
            assert c.ai_prediction is not None
            assert len(c.status_history) >= 1
            for att in c.attachments:
                assert att.storage_path.startswith("complaints/")
                logger.info(
                    "Complaint %s -> Attachment: %s (%s, %d bytes)",
                    c.reference_number, att.filename, att.storage_path, att.file_size_bytes
                )
        logger.info("[PASSED] All complaint relationships, AI predictions, and attachments verified.")

        # TEST 5: PostgreSQL Foreign Key Enforcement
        logger.info("[TEST 5] Testing PostgreSQL foreign-key constraint enforcement...")
        bad_complaint = Complaint(
            id="00000000-0000-0000-0000-000000000001",
            reference_number="REF-TEST-INVALID-FK",
            tracking_pin_hash="dummy_hash",
            title="Invalid FK test",
            description="Testing foreign key rejection",
            status=ComplaintStatus.SUBMITTED,
            category=CivicCategory.OTHER,
            department_id="non-existent-dept-id-12345",  # Invalid FK
        )
        session.add(bad_complaint)
        try:
            await session.flush()
            raise AssertionError("PostgreSQL failed to enforce foreign key constraint!")
        except IntegrityError:
            await session.rollback()
            logger.info("[PASSED] PostgreSQL successfully enforced foreign-key constraint (IntegrityError raised).")

        # TEST 6: Transactional Read/Write Capability in PostgreSQL
        logger.info("[TEST 6] Testing live PostgreSQL write and rollback transaction...")
        test_event = AuditEvent(
            entity_type="SYSTEM",
            entity_id="migration-test",
            action_type=AuditActionType.STATUS_CHANGED,
            actor_id=None,
            actor_email="audit@smartcity.gov",
            details={"test": "pg_write_verification", "timestamp": str(datetime.now(timezone.utc))},
            ip_address="127.0.0.1",
        )
        session.add(test_event)
        await session.flush()
        saved_id = test_event.id
        assert saved_id is not None

        # Verify read back
        read_res = await session.execute(select(AuditEvent).where(AuditEvent.id == saved_id))
        read_event = read_res.scalar_one_or_none()
        assert read_event is not None
        assert read_event.details["test"] == "pg_write_verification"

        # Clean up test event
        await session.delete(read_event)
        await session.commit()
        logger.info("[PASSED] Live PostgreSQL write, read, and delete cycle completed cleanly.")

    logger.info("=================================================================")
    logger.info("ALL LIVE SUPABASE POSTGRESQL INTEGRATION TESTS PASSED (6/6)")
    logger.info("=================================================================")


if __name__ == "__main__":
    asyncio.run(run_live_postgresql_tests())
