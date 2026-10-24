# ==============================================================================
# CIVICPULSE — GOOGLE CLOUD RUN PRODUCTION BACKEND DOCKERFILE
# CPU-Optimized FastAPI + PyTorch ResNet18-BiLSTM-Attention Serverless Container
# ==============================================================================

FROM python:3.11-slim-bookworm

# Prevent Python from writing .pyc files and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8080 \
    PYTHONPATH="/app"

WORKDIR /app

# Install minimal OS runtime tools (curl for healthchecks, libgomp1 for OpenMP/PyTorch)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# 1. Install CPU-only PyTorch and torchvision wheels first
# This prevents pulling ~2.5GB of CUDA packages and reduces image size to ~650MB.
RUN pip install --no-cache-dir \
    torch==2.4.1+cpu \
    torchvision==0.19.1+cpu \
    --index-url https://download.pytorch.org/whl/cpu

# 2. Copy dependency manifest and install remaining backend requirements
COPY backend/requirements.txt /app/requirements.txt
RUN grep -vE '^(torch|torchvision)' /app/requirements.txt > /tmp/requirements-nocuda.txt && \
    pip install --no-cache-dir -r /tmp/requirements-nocuda.txt && \
    rm /tmp/requirements-nocuda.txt

# 3. Copy application codebase and Alembic configuration
COPY backend/app /app/app
COPY backend/alembic /app/alembic
COPY backend/alembic.ini /app/alembic.ini

# 4. Verify model checkpoint integrity at container build time
# Guarantees that the real weights binary was copied (fails if LFS pointer)
RUN python -c "from pathlib import Path; p = Path('app/ml/weights/best_resnet18_bilstm_attention_clean.pt'); assert p.is_file(), 'Checkpoint missing'; assert p.stat().st_size > 40000000, f'Checkpoint too small ({p.stat().st_size} bytes) - ensure git-lfs pull was run'; from app.ml.model import model_manager; model_manager.load_model(); print('Checkpoint integrity verified successfully.')"

# Expose default Cloud Run container port
EXPOSE 8080

# Health check probe using the existing /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8080}/health || exit 1

# Launch single-worker Uvicorn process listening on 0.0.0.0:$PORT
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1"]
