import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.user import Department, User

logger = logging.getLogger(__name__)

INITIAL_DEPARTMENTS = [
    {
        "code": "ROAD_AUTHORITY",
        "name": "Road Authority",
        "description": "Responsible for road damage, pothole repairs, street pavement, and surface maintenance.",
        "contact_email": "roads@smartcity.gov",
    },
    {
        "code": "GARBAGE_DEPT",
        "name": "Garbage Department",
        "description": "Responsible for municipal waste collection, sanitation, dumpster emptying, and public hygiene.",
        "contact_email": "sanitation@smartcity.gov",
    },
    {
        "code": "INFRASTRUCTURE",
        "name": "Infrastructure Department",
        "description": "Responsible for streetlights, electrical infrastructure, signals, and public utilities.",
        "contact_email": "infrastructure@smartcity.gov",
    },
    {
        "code": "WATER_DEPT",
        "name": "Water Department",
        "description": "Responsible for municipal water supply lines, pipeline burst repairs, drainage, and water leaks.",
        "contact_email": "water@smartcity.gov",
    },
]

INITIAL_OFFICERS = [
    {
        "email": "officer.road@smartcity.gov",
        "full_name": "Chief Engineer - Road Authority",
        "phone_number": "+1-555-0101",
        "department_code": "ROAD_AUTHORITY",
    },
    {
        "email": "officer.garbage@smartcity.gov",
        "full_name": "Sanitation Officer - Waste Management",
        "phone_number": "+1-555-0102",
        "department_code": "GARBAGE_DEPT",
    },
    {
        "email": "officer.infra@smartcity.gov",
        "full_name": "Grid Specialist - Infrastructure Dept",
        "phone_number": "+1-555-0103",
        "department_code": "INFRASTRUCTURE",
    },
    {
        "email": "officer.water@smartcity.gov",
        "full_name": "Hydraulic Supervisor - Water Dept",
        "phone_number": "+1-555-0104",
        "department_code": "WATER_DEPT",
    },
]


async def seed_database(session: AsyncSession) -> None:
    """Idempotently seed essential departments, default administrator, and initial officers."""
    dept_map = {}
    for d_data in INITIAL_DEPARTMENTS:
        result = await session.execute(
            select(Department).where(Department.code == d_data["code"])
        )
        dept = result.scalar_one_or_none()
        if not dept:
            dept = Department(
                code=d_data["code"],
                name=d_data["name"],
                description=d_data["description"],
                contact_email=d_data["contact_email"],
            )
            session.add(dept)
            await session.flush()
            logger.info("Created department: %s", dept.name)
        dept_map[dept.code] = dept

    # Seed Initial Administrator
    admin_result = await session.execute(
        select(User).where(User.email == settings.INITIAL_ADMIN_EMAIL)
    )
    admin = admin_result.scalar_one_or_none()
    if not admin:
        admin = User(
            email=settings.INITIAL_ADMIN_EMAIL,
            full_name=settings.INITIAL_ADMIN_NAME,
            hashed_password=hash_password(settings.INITIAL_ADMIN_PASSWORD),
            role=UserRole.ADMIN,
            is_active=True,
        )
        session.add(admin)
        logger.info("Provisioned initial administrator: %s", settings.INITIAL_ADMIN_EMAIL)

    # Seed Department Officers for demonstration and integration testing
    for off_data in INITIAL_OFFICERS:
        off_result = await session.execute(
            select(User).where(User.email == off_data["email"])
        )
        officer = off_result.scalar_one_or_none()
        if not officer and off_data["department_code"] in dept_map:
            officer = User(
                email=off_data["email"],
                full_name=off_data["full_name"],
                phone_number=off_data["phone_number"],
                hashed_password=hash_password("Officer@SmartCity2026!"),
                role=UserRole.OFFICER,
                department_id=dept_map[off_data["department_code"]].id,
                is_active=True,
            )
            session.add(officer)
            logger.info("Provisioned department officer: %s", off_data["email"])

    # Seed Sample Citizen
    citizen_email = "citizen@smartcity.gov"
    cit_result = await session.execute(select(User).where(User.email == citizen_email))
    citizen = cit_result.scalar_one_or_none()
    if not citizen:
        citizen = User(
            email=citizen_email,
            full_name="Jane Doe (Verified Citizen)",
            phone_number="+1-555-0199",
            hashed_password=hash_password("Citizen@SmartCity2026!"),
            role=UserRole.CITIZEN,
            is_active=True,
        )
        session.add(citizen)
        logger.info("Provisioned sample citizen: %s", citizen_email)

    await session.commit()
