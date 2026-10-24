import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.v1 import admin, auth, complaints, department, files, notifications
from app.config import settings
from app.core.exceptions import AppException
from app.db.base import Base
from app.db.seed import seed_database
from app.db.session import AsyncSessionLocal, engine
from app.ml.model import model_manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("smart_city_api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup & shutdown lifespan events."""
    logger.info("Initializing Smart City Complaint Management Backend...")

    # 1. Initialize schema in development / SQLite only (PostgreSQL uses Alembic)
    if settings.DATABASE_URL.startswith("sqlite"):
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("SQLite database schema verified/created via create_all.")
    else:
        logger.info("PostgreSQL mode detected: schema management is managed exclusively via Alembic.")

    # 2. Seed initial departments, administrator, and demo accounts
    async with AsyncSessionLocal() as session:
        await seed_database(session)
    logger.info("Initial data seeding verified.")

    # 3. Load ResNet18 + BiLSTM + Attention model
    try:
        model_manager.load_model()
        logger.info("%s image classifier loaded and ready for inference.", model_manager.model_name)
    except Exception as e:
        logger.error("Failed to preload ML model on startup: %s", e)

    yield

    logger.info("Shutting down Smart City Complaint Management Backend.")
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Production-grade Smart City Complaint Management API with AI image classification and deterministic department routing.",
    lifespan=lifespan,
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_CORS_ORIGINS,
    allow_origin_regex=r"^https:\/\/([a-zA-Z0-9-]+\.)*infalex\.com$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    """Standardized response format for domain exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.detail,
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global catch-all to prevent stack traces from leaking to clients."""
    logger.error("Unhandled server exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error_code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected server error occurred. Please contact system support.",
        },
    )


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    model_ready = model_manager._model is not None
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "ai_model_loaded": model_ready,
        "ai_model_name": model_manager.model_name,
        "ai_confidence_threshold": settings.AI_CONFIDENCE_THRESHOLD,
    }


# Mount API Routers
api_v1_prefix = settings.API_V1_PREFIX
app.include_router(auth.router, prefix=api_v1_prefix)
app.include_router(complaints.router, prefix=api_v1_prefix)
app.include_router(department.router, prefix=api_v1_prefix)
app.include_router(admin.router, prefix=api_v1_prefix)
app.include_router(files.router, prefix=api_v1_prefix)
app.include_router(notifications.router, prefix=api_v1_prefix)
