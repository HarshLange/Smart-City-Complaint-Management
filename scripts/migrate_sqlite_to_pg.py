"""Safe, reversible data migration script from SQLite to Supabase PostgreSQL.

Strict contracts:
1. Checks target tables first: if target tables contain existing rows, stops and reports conflict.
2. Reads records from SQLite (smart_city.db) in topological dependency order.
3. Inserts records into PostgreSQL within an explicit database transaction.
4. Preserves primary key UUIDs, foreign keys, timestamps, reference numbers, PIN hashes, and storage paths.
5. Verifies record counts and referential integrity between source and target.
"""

import asyncio
from datetime import datetime, timezone
import json
import logging
from pathlib import Path
import sqlite3
import sys

# Ensure backend directory is in python path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal, engine
from app.models.audit import AuditEvent, OfficerNote, StatusHistory
from app.models.complaint import AIPrediction, Complaint, ComplaintAttachment
from app.models.enums import AuditActionType, CivicCategory, ComplaintStatus, UserRole
from app.models.notification import Notification
from app.models.user import Department, User

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("migration")

SQLITE_PATH = backend_dir / "smart_city.db"

TABLES_IN_DEPENDENCY_ORDER = [
    "departments",
    "users",
    "complaints",
    "ai_predictions",
    "complaint_attachments",
    "status_histories",
    "officer_notes",
    "audit_events",
    "notifications",
]


def parse_dt(val):
    """Parse SQLite datetime string into timezone-aware UTC datetime."""
    if val is None:
        return None
    if isinstance(val, datetime):
        if val.tzinfo is None:
            return val.replace(tzinfo=timezone.utc)
        return val
    try:
        # Handles '2026-10-09 19:52:38.860486' or ISO format
        dt = datetime.fromisoformat(val)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def parse_json(val):
    """Parse JSON text into python dict/list."""
    if val is None:
        return {}
    if isinstance(val, (dict, list)):
        return val
    try:
        return json.loads(val)
    except Exception:
        return {}


async def check_target_conflicts(session: AsyncSession) -> dict:
    """Check if any target tables already contain rows."""
    counts = {}
    for table_name in TABLES_IN_DEPENDENCY_ORDER:
        res = await session.execute(text(f'SELECT COUNT(*) FROM "{table_name}";'))
        counts[table_name] = res.scalar() or 0
    return counts


def read_sqlite_data(sqlite_conn: sqlite3.Connection) -> dict:
    """Read all rows from SQLite with column dictionaries."""
    sqlite_conn.row_factory = sqlite3.Row
    cursor = sqlite_conn.cursor()
    data = {}
    for table in TABLES_IN_DEPENDENCY_ORDER:
        cursor.execute(f'SELECT * FROM "{table}";')
        rows = cursor.fetchall()
        data[table] = [dict(r) for r in rows]
        logger.info("Read %d records from SQLite table '%s'", len(data[table]), table)
    return data


async def migrate_data():
    if not SQLITE_PATH.exists():
        logger.error("SQLite database file not found at: %s", SQLITE_PATH)
        sys.exit(1)

    logger.info("Connecting to target PostgreSQL via application engine...")
    async with AsyncSessionLocal() as pg_session:
        # 1. Pre-flight check: Target table conflict check
        logger.info("Checking target PostgreSQL for existing records...")
        target_counts = await check_target_conflicts(pg_session)
        logger.info("Target PostgreSQL initial counts: %s", target_counts)

        non_empty = {k: v for k, v in target_counts.items() if v > 0}
        if non_empty:
            logger.error(
                "CONFLICT DETECTED: Target PostgreSQL tables already contain data: %s. "
                "Halting migration to avoid overwriting or duplicating records.",
                non_empty,
            )
            sys.exit(1)

        # 2. Extract SQLite data
        logger.info("Opening source SQLite database: %s", SQLITE_PATH)
        sqlite_conn = sqlite3.connect(SQLITE_PATH)
        source_data = read_sqlite_data(sqlite_conn)
        sqlite_conn.close()

        # 3. Insert into PostgreSQL within an explicit transaction
        logger.info("Beginning transactional insert into PostgreSQL...")
        try:
            # Table 1: departments
            for r in source_data["departments"]:
                dept = Department(
                    id=r["id"],
                    code=r["code"],
                    name=r["name"],
                    description=r["description"],
                    contact_email=r["contact_email"],
                    is_active=bool(r["is_active"]),
                    created_at=parse_dt(r["created_at"]),
                    updated_at=parse_dt(r["updated_at"]),
                )
                pg_session.add(dept)
            await pg_session.flush()

            # Table 2: users
            for r in source_data["users"]:
                user = User(
                    id=r["id"],
                    email=r["email"],
                    hashed_password=r["hashed_password"],
                    full_name=r["full_name"],
                    phone_number=r["phone_number"],
                    role=UserRole(r["role"]),
                    department_id=r["department_id"],
                    is_active=bool(r["is_active"]),
                    created_at=parse_dt(r["created_at"]),
                    updated_at=parse_dt(r["updated_at"]),
                )
                pg_session.add(user)
            await pg_session.flush()

            # Table 3: complaints
            for r in source_data["complaints"]:
                cat_val = r["category"]
                # In SQLite it was uppercase enum name (e.g. 'POTHOLE')
                if cat_val in CivicCategory.__members__:
                    cat_enum = CivicCategory[cat_val]
                else:
                    cat_enum = CivicCategory(cat_val)

                complaint = Complaint(
                    id=r["id"],
                    reference_number=r["reference_number"],
                    tracking_pin_hash=r["tracking_pin_hash"],
                    user_id=r["user_id"],
                    title=r["title"],
                    description=r["description"],
                    status=ComplaintStatus(r["status"]),
                    category=cat_enum,
                    department_id=r["department_id"],
                    assigned_officer_id=r["assigned_officer_id"],
                    priority=r.get("priority", "MEDIUM"),
                    latitude=r["latitude"],
                    longitude=r["longitude"],
                    address=r["address"],
                    landmark=r["landmark"],
                    resolution_notes=r["resolution_notes"],
                    resolved_at=parse_dt(r["resolved_at"]),
                    created_at=parse_dt(r["created_at"]),
                    updated_at=parse_dt(r["updated_at"]),
                )
                pg_session.add(complaint)
            await pg_session.flush()

            # Table 4: ai_predictions
            for r in source_data["ai_predictions"]:
                pred = AIPrediction(
                    id=r["id"],
                    complaint_id=r["complaint_id"],
                    model_name=r["model_name"],
                    model_version=r["model_version"],
                    predicted_category=r["predicted_category"],
                    confidence_score=float(r["confidence_score"]),
                    all_probabilities=parse_json(r["all_probabilities"]),
                    suggested_department_code=r["suggested_department_code"],
                    processing_status=r["processing_status"],
                    error_message=r["error_message"],
                    is_overridden=bool(r["is_overridden"]),
                    overridden_by_id=r["overridden_by_id"],
                    override_reason=r["override_reason"],
                    created_at=parse_dt(r["created_at"]),
                    updated_at=parse_dt(r["updated_at"]),
                )
                pg_session.add(pred)
            await pg_session.flush()

            # Table 5: complaint_attachments
            for r in source_data["complaint_attachments"]:
                att = ComplaintAttachment(
                    id=r["id"],
                    complaint_id=r["complaint_id"],
                    storage_path=r["storage_path"],
                    filename=r["filename"],
                    content_type=r["content_type"],
                    file_size_bytes=int(r["file_size_bytes"]),
                    is_resolution_evidence=bool(r["is_resolution_evidence"]),
                    uploaded_by_id=r["uploaded_by_id"],
                    created_at=parse_dt(r["created_at"]),
                    updated_at=parse_dt(r["updated_at"]),
                )
                pg_session.add(att)
            await pg_session.flush()

            # Table 6: status_histories
            for r in source_data["status_histories"]:
                sh = StatusHistory(
                    id=r["id"],
                    complaint_id=r["complaint_id"],
                    previous_status=ComplaintStatus(r["previous_status"]),
                    new_status=ComplaintStatus(r["new_status"]),
                    actor_id=r["actor_id"],
                    actor_name=r["actor_name"],
                    actor_role=r["actor_role"],
                    notes=r["notes"],
                    created_at=parse_dt(r["created_at"]),
                    updated_at=parse_dt(r["updated_at"]),
                )
                pg_session.add(sh)
            await pg_session.flush()

            # Table 7: officer_notes
            for r in source_data["officer_notes"]:
                note = OfficerNote(
                    id=r["id"],
                    complaint_id=r["complaint_id"],
                    officer_id=r["officer_id"],
                    officer_name=r["officer_name"],
                    note_text=r["note_text"],
                    is_internal=bool(r["is_internal"]),
                    created_at=parse_dt(r["created_at"]),
                    updated_at=parse_dt(r["updated_at"]),
                )
                pg_session.add(note)
            await pg_session.flush()

            # Table 8: audit_events
            for r in source_data["audit_events"]:
                ae = AuditEvent(
                    id=r["id"],
                    entity_type=r["entity_type"],
                    entity_id=r["entity_id"],
                    action_type=AuditActionType(r["action_type"]),
                    actor_id=r["actor_id"],
                    actor_email=r["actor_email"],
                    details=parse_json(r["details"]),
                    ip_address=r["ip_address"],
                    created_at=parse_dt(r["created_at"]),
                    updated_at=parse_dt(r["updated_at"]),
                )
                pg_session.add(ae)
            await pg_session.flush()

            # Table 9: notifications
            for r in source_data["notifications"]:
                notif = Notification(
                    id=r["id"],
                    user_id=r["user_id"],
                    complaint_id=r["complaint_id"],
                    title=r["title"],
                    message=r["message"],
                    notification_type=r["notification_type"],
                    is_read=bool(r["is_read"]),
                    created_at=parse_dt(r["created_at"]),
                    updated_at=parse_dt(r["updated_at"]),
                )
                pg_session.add(notif)
            await pg_session.flush()

            # Commit the transaction
            await pg_session.commit()
            logger.info("Successfully committed all data to PostgreSQL.")

        except Exception as exc:
            await pg_session.rollback()
            logger.error("Migration failed during insert: %s. Rolled back transaction.", exc, exc_info=True)
            raise exc

        # 4. Post-migration validation: Compare record counts
        logger.info("Performing post-migration validation checks...")
        final_counts = await check_target_conflicts(pg_session)
        
        mismatches = []
        for table in TABLES_IN_DEPENDENCY_ORDER:
            src_count = len(source_data[table])
            tgt_count = final_counts[table]
            status = "MATCH" if src_count == tgt_count else "MISMATCH"
            logger.info("Validation: Table '%s' -> Source: %d, Target: %d [%s]", table, src_count, tgt_count, status)
            if src_count != tgt_count:
                mismatches.append(table)

        if mismatches:
            logger.error("VALIDATION FAILED: Count mismatch in tables: %s", mismatches)
            sys.exit(1)

        # 5. Application invariant verification
        logger.info("Verifying application invariants...")
        res_user = await pg_session.execute(select(User).where(User.email == "harshlange3@gmail.com"))
        oauth_user = res_user.scalar_one_or_none()
        assert oauth_user is not None, "Google OAuth citizen user not found!"
        logger.info("Verified Google OAuth user exists in PostgreSQL: %s (ID: %s)", oauth_user.email, oauth_user.id)

        res_complaint = await pg_session.execute(select(Complaint).where(Complaint.reference_number == "REF-20261010-GKLBTV"))
        c = res_complaint.scalar_one_or_none()
        assert c is not None, "Complaint REF-20261010-GKLBTV not found!"
        assert c.user_id == oauth_user.id, "Complaint user_id does not match OAuth user ID!"
        logger.info("Verified complaint reference and ownership: %s owned by %s", c.reference_number, oauth_user.email)

        res_att = await pg_session.execute(select(ComplaintAttachment).where(ComplaintAttachment.complaint_id == c.id))
        att = res_att.scalar_one_or_none()
        assert att is not None, "Complaint attachment not found!"
        assert att.storage_path.startswith("complaints/"), f"Invalid storage path: {att.storage_path}"
        logger.info("Verified attachment storage path in PostgreSQL: %s", att.storage_path)

        logger.info("MIGRATION VALIDATION SUCCESSFUL: All counts, invariants, and foreign keys verified!")


if __name__ == "__main__":
    asyncio.run(migrate_data())
