# CivicPulse — Demo Deployment Compatibility Audit

**Project:** CivicPulse — Smart City Complaint Management System  
**Repository Path:** `C:\ARMIET\Smart_City_Complaint_Management`  
**GitHub:** `https://github.com/HarshLange/Smart-City-Complaint-Management`  
**Audit Date:** October 10, 2026  
**Auditor Roles:** Senior DevOps Engineer, Cloud Architect, Application Security Auditor, ML Deployment Engineer  
**Scope:** Restricted Academic Demo Deployment (Cloudflare Pages + Google Cloud Run + Supabase PostgreSQL/Auth/Storage + Subdomain of `infalex.com`)  

---

## 1. Executive Verdict

### Verdict: **CONDITIONALLY READY**

The CivicPulse application is **architecturally and functionally compatible** with a restricted academic demo deployment hosted on **Cloudflare Pages** (Frontend) and **Google Cloud Run** (Backend with CPU ML inference), integrated with **Supabase PostgreSQL**, **Supabase Auth**, and **Supabase Storage**.

The underlying codebase is robust:
- The React/Vite/TypeScript frontend compiles cleanly with 0 errors.
- The FastAPI backend passes 34/34 automated tests (100% pass rate).
- The EfficientNetV2-S PyTorch model benchmarked on CPU executes in **~73 ms average inference latency** with a modest **~435 MB resident working set RAM**, making it an outstanding fit for Cloud Run's serverless CPU tier.
- Database queries utilize parameterized asyncpg drivers with `statement_cache_size=0`, fully compatible with Supabase's transaction/session connection pooler.
- Storage operates with private HMAC-signed URLs, preventing public evidence leakage.

However, deployment cannot succeed out-of-the-box without addressing **5 specific configuration and deployment prerequisites**:
1. **Frontend API Base URL:** [`frontend/src/api/client.ts`](file:///c:/ARMIET/Smart_City_Complaint_Management/frontend/src/api/client.ts#L15) hardcodes `const API_BASE = "/api/v1";`. In a cross-origin deployment (Cloudflare Pages → Cloud Run), this must be parameterized via `import.meta.env.VITE_API_BASE_URL`.
2. **Missing Container Specification:** The repository lacks a `Dockerfile`. A streamlined CPU-only Dockerfile must be introduced for Cloud Run.
3. **Cloudflare SPA Routing:** [`frontend/public/`](file:///c:/ARMIET/Smart_City_Complaint_Management/frontend/public) lacks a `_redirects` file (`/* /index.html 200`), which causes direct page refreshes on `/dashboard`, `/track`, or `/auth/callback` to return Cloudflare 404s.
4. **Backend CORS Configuration:** [`backend/app/config.py`](file:///c:/ARMIET/Smart_City_Complaint_Management/backend/app/config.py#L50-L54) defaults to localhost origins. The Cloud Run service must receive `ALLOWED_CORS_ORIGINS` containing the `infalex.com` subdomains.
5. **Supabase Auth Redirect Allowlists:** Supabase Dashboard must explicitly whitelist `https://civicpulse.infalex.com/auth/callback` and `https://project.infalex.com/auth/callback`.

---

## 2. Recommended Deployment Architecture & Data Flow

```mermaid
flowchart TD
    subgraph Client ["Client Browser (Desktop & Mobile)"]
        User["Citizen / Officer / Admin"]
    end

    subgraph Edge ["Cloudflare Global Network"]
        CF_Pages["Cloudflare Pages<br/>https://civicpulse.infalex.com<br/>(SPA React 19 + Vite Static Assets)"]
        CF_DNS["Cloudflare Managed DNS & SSL<br/>(infalex.com Zone)"]
    end

    subgraph GCP ["Google Cloud Platform (GCP)"]
        CloudRun["Google Cloud Run (Managed Serverless)<br/>https://civicpulse-api-xyz.run.app<br/>(Container: Python 3.11 + FastAPI + PyTorch CPU)"]
        ML_Model["EfficientNetV2-S Weights<br/>(In-Memory: 435 MB RAM, 73ms Latency)"]
    end

    subgraph Supabase ["Supabase Managed Cloud Platform"]
        Supa_Auth["Supabase Auth / Google OAuth<br/>(JWKS ES256 Verification)"]
        Supa_PG["Supabase PostgreSQL (AWS Tokyo pooler:5432)<br/>(Alembic Migration Head 095500de9e84)"]
        Supa_Store["Supabase Storage<br/>(Private Bucket: complaint-images)"]
    end

    User -->|HTTPS :443| CF_Pages
    CF_Pages -->|Static Bundle & SPA Navigation| User
    User -->|API Requests: Bearer JWT / JSON| CloudRun
    CloudRun -->|1. Predict Defect Category| ML_Model
    CloudRun -->|2. Asymmetric JWT Validation| Supa_Auth
    CloudRun -->|3. Query / Insert asyncpg :5432| Supa_PG
    CloudRun -->|4. Upload Image & Create Signed URL| Supa_Store
    User -->|OAuth Redirection / Callback| Supa_Auth
    User -->|Stream Secure Photo Evidence| CloudRun
```

### Request Flow Summary:
1. **Static UI Delivery:** Cloudflare Pages serves the minified HTML, CSS, and JS bundles over Cloudflare's global edge network on `https://civicpulse.infalex.com`.
2. **Cross-Origin API Communication:** The React app sends REST requests to the Cloud Run backend endpoint (`https://civicpulse-api-xyz.run.app/api/v1` or `https://api.infalex.com/api/v1`), authenticated via `Authorization: Bearer <token>`.
3. **AI Inference Pipeline:** Image uploads are validated by Pillow, preprocessed via Torchvision, and classified in-memory on CPU by EfficientNetV2-S in ~73 ms.
4. **Persistence & Storage:** FastAPI writes complaint records to Supabase PostgreSQL and uploads binary evidence to Supabase Storage.
5. **Private Image Streaming:** Evidence photos are viewed via time-limited signed URLs (300s TTL) or authenticated blob streaming through the backend proxy.

---

## 3. Component-by-Component Compatibility Matrix

| Component | Target Service | Compatibility Status | Key Findings & Requirements |
| :--- | :--- | :---: | :--- |
| **Frontend UI** | Cloudflare Pages | **COMPATIBLE WITH CONFIG** | React 19 + Vite 6 compiles cleanly. Requires `_redirects` file for SPA routing and environment variable injection for `VITE_API_BASE_URL`. |
| **Backend API** | Google Cloud Run | **COMPATIBLE WITH CONTAINER** | FastAPI ASGI app is stateless. Requires Dockerfile, CPU-only PyTorch wheel optimization, and dynamic port binding (`0.0.0.0:$PORT`). |
| **ML Inference** | Cloud Run CPU | **COMPATIBLE** | EfficientNetV2-S requires ~435 MB RAM. Latency on CPU is ~73 ms. 1 vCPU and 1–2 GiB Cloud Run instances provide ample headroom. No GPU required. |
| **Database** | Supabase PostgreSQL | **COMPATIBLE** | Alembic schema at head revision `095500de9e84`. Uses connection pooler (`aws-0-ap-northeast-1.pooler.supabase.com:5432`) with `statement_cache_size=0`. |
| **Authentication** | Supabase Auth | **COMPATIBLE** | Backend decodes Supabase JWKS (ES256/RS256) and local HS256 tokens. Requires adding demo domain to Supabase redirect allowlists. |
| **Evidence Storage**| Supabase Storage | **COMPATIBLE** | Private bucket `complaint-images` with signed URLs and compensating transaction cleanup verified. |
| **Custom Domain** | `*.infalex.com` | **COMPATIBLE** | CNAME pointing to Cloudflare Pages; Cloud Run can be invoked via default `.run.app` URL or custom subdomain mapping. |

---

## 4. Confirmed Blockers (Ranked by Severity)

### Blocker BLK-01 (Severity: CRITICAL) — Hardcoded Relative API Base URL
- **Severity:** **CRITICAL**
- **Evidence:** [`frontend/src/api/client.ts`](file:///c:/ARMIET/Smart_City_Complaint_Management/frontend/src/api/client.ts#L15):
  ```typescript
  const API_BASE = "/api/v1";
  ```
- **Demo Impact:** Cloudflare Pages hosts static assets on `civicpulse.infalex.com`. Relative API calls (`/api/v1/...`) will resolve to `https://civicpulse.infalex.com/api/v1/...` instead of the Cloud Run backend URL, causing 100% of API requests to fail with HTTP 404.
- **Required Action:** Refactor line 15 to:
  ```typescript
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";
  ```
- **Verification Method:** Build frontend with `VITE_API_BASE_URL=https://test-api.run.app/api/v1` and verify generated JS calls the remote target.
- **Status:** **CONFIRMED**

### Blocker BLK-02 (Severity: HIGH) — Missing Cloud Run Dockerfile & Container Build Manifest
- **Severity:** **HIGH**
- **Evidence:** Repository root and `backend/` contain zero Dockerfile, `.dockerignore`, or container build scripts.
- **Demo Impact:** Google Cloud Run cannot build or deploy the backend without a container definition.
- **Required Action:** Author a lightweight, CPU-optimized Dockerfile specifying Python 3.11-slim, CPU PyTorch wheels, and Uvicorn process listening on `0.0.0.0:$PORT`.
- **Verification Method:** Execute `docker build -t civicpulse-backend .` and verify container starts and passes `/health`.
- **Status:** **CONFIRMED**

### Blocker BLK-03 (Severity: HIGH) — Missing Cloudflare Pages SPA Routing Fallback
- **Severity:** **HIGH**
- **Evidence:** [`frontend/public/`](file:///c:/ARMIET/Smart_City_Complaint_Management/frontend/public) contains only `favicon.svg` and `icons.svg`. No `_redirects` file exists.
- **Demo Impact:** Direct browser navigation or refreshing on `/dashboard`, `/track`, `/complaints/:id`, or `/auth/callback` will cause Cloudflare Pages to return an edge 404 error instead of serving `index.html`.
- **Required Action:** Add `frontend/public/_redirects` with rule:
  ```
  /*    /index.html   200
  ```
- **Verification Method:** Deploy to Cloudflare Pages preview and test refreshing `/track`.
- **Status:** **CONFIRMED**

### Blocker BLK-04 (Severity: HIGH) — Localhost-Only CORS Allowlist in Production Backend
- **Severity:** **HIGH**
- **Evidence:** [`backend/app/config.py`](file:///c:/ARMIET/Smart_City_Complaint_Management/backend/app/config.py#L50-L54):
  ```python
  ALLOWED_CORS_ORIGINS: Union[List[str], str] = [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:3000",
  ]
  ```
- **Demo Impact:** Browser requests from `https://civicpulse.infalex.com` to the Cloud Run backend will be rejected by CORS preflight checks (`OPTIONS 403 / CORS Missing Allow Origin`).
- **Required Action:** Provide environment variable to Cloud Run:
  ```env
  ALLOWED_CORS_ORIGINS='["https://civicpulse.infalex.com", "https://project.infalex.com", "http://localhost:5173"]'
  ```
- **Verification Method:** Issue `curl -X OPTIONS -H "Origin: https://civicpulse.infalex.com" https://civicpulse-api-xyz.run.app/health` and verify `Access-Control-Allow-Origin` header is returned.
- **Status:** **CONFIRMED**

---

## 5. High-, Medium-, and Low-Priority Findings

### High-Priority Findings

#### FND-01: Git LFS Dependency on Model Weights Artifact
- **Severity:** **HIGH**
- **Evidence:** `.gitattributes`: `backend/app/ml/weights/best_model.pt filter=lfs diff=lfs merge=lfs -text`.
- **Demo Impact:** If Google Cloud Build or GitHub Actions clones the repository without `git-lfs` installed, `best_model.pt` will be a 130-byte text pointer instead of the 78 MB binary weights. Container startup will fail with `torch.load` exception.
- **Required Action:** In Dockerfile build instructions or CI workflows, ensure `git lfs pull` is run prior to building the Docker context, or explicitly verify that `best_model.pt` is >70 MB before copying.
- **Status:** **CONFIRMED**

#### FND-02: PyTorch CUDA Bloat in Standard Requirements.txt
- **Severity:** **HIGH**
- **Evidence:** [`backend/requirements.txt`](file:///c:/ARMIET/Smart_City_Complaint_Management/backend/requirements.txt#L20-L21) specifies `torch>=2.4.0` and `torchvision>=0.19.0`.
- **Demo Impact:** A standard `pip install -r requirements.txt` on Linux downloads the default CUDA-bundled wheels (~2.5 GB to 3.0 GB), resulting in a container image exceeding 4.5 GB, increasing Cloud Run deployment times and cold-start latency.
- **Required Action:** In the Dockerfile, pre-install the CPU-only PyTorch wheel via:
  ```dockerfile
  RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu
  ```
  This reduces total container image size to **~650 MB**.
- **Status:** **CONFIRMED**

### Medium-Priority Findings

#### FND-03: Hardcoded Supabase URL in Frontend Login
- **Severity:** **MEDIUM**
- **Evidence:** [`frontend/src/pages/public/LoginPage.tsx`](file:///c:/ARMIET/Smart_City_Complaint_Management/frontend/src/pages/public/LoginPage.tsx#L36):
  ```typescript
  const supabaseUrl = "https://sagibkveeaciobapkgrt.supabase.co";
  ```
- **Demo Impact:** While this points to the active project for this demo, hardcoding prevents environment switching between local, staging, and demo Supabase projects without code changes.
- **Required Action:** Refactor to `const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://sagibkveeaciobapkgrt.supabase.co";`.
- **Status:** **CONFIRMED**

#### FND-04: Client-Side Simulated Contact Form
- **Severity:** **MEDIUM**
- **Evidence:** [`frontend/src/pages/public/ContactPage.tsx`](file:///c:/ARMIET/Smart_City_Complaint_Management/frontend/src/pages/public/ContactPage.tsx#L23-L26):
  ```typescript
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };
  ```
- **Demo Impact:** The form displays a success badge without submitting an API request. During a professor demo, filling this form might create confusion if expected to appear in an admin inbox.
- **Required Action:** For the demo, either attach a note indicating this is an informational mockup or link to direct mailto contacts (`contact_email` from active departments).
- **Status:** **CONFIRMED**

#### FND-05: In-Memory Rate Limiting Under Multi-Instance Cloud Run
- **Severity:** **MEDIUM**
- **Evidence:** [`backend/app/core/rate_limiter.py`](file:///c:/ARMIET/Smart_City_Complaint_Management/backend/app/core/rate_limiter.py): Rate limiters maintain state in local Python dictionary instances (`self.requests: Dict[str, List[float]]`).
- **Demo Impact:** If Cloud Run scales to multiple instances, rate limiting counters are not synchronized across instances.
- **Required Action:** For an academic demo with `min-instances=0, max-instances=2`, this is completely acceptable. Document that centralized Redis rate limiting is a production enhancement.
- **Status:** **CONFIRMED**

### Low-Priority Findings

#### FND-06: Tracking PIN Hash Algorithm Description in Privacy Policy
- **Severity:** **LOW**
- **Evidence:** [`frontend/src/pages/public/PrivacyPolicyPage.tsx`](file:///c:/ARMIET/Smart_City_Complaint_Management/frontend/src/pages/public/PrivacyPolicyPage.tsx#L66) describes PIN hashes as "salted SHA-256", whereas [`backend/app/core/security.py`](file:///c:/ARMIET/Smart_City_Complaint_Management/backend/app/core/security.py#L118-L120) implements BCrypt (`hash_password`).
- **Demo Impact:** Purely cosmetic/documentation discrepancy; BCrypt is cryptographically superior.
- **Required Action:** Update copy to say "salted BCrypt password-grade hashes".
- **Status:** **CONFIRMED**

---

## 6. Code Findings & Source References

| Finding ID | File Path | Line Range | Description |
| :--- | :--- | :---: | :--- |
| **BLK-01** | `frontend/src/api/client.ts` | [Line 15](file:///c:/ARMIET/Smart_City_Complaint_Management/frontend/src/api/client.ts#L15) | Hardcoded relative `API_BASE = "/api/v1"` breaks cross-origin Cloudflare Pages deployment. |
| **BLK-03** | `frontend/public/` | [N/A](file:///c:/ARMIET/Smart_City_Complaint_Management/frontend/public) | Missing `_redirects` file required for Cloudflare Pages SPA client-side routing. |
| **BLK-04** | `backend/app/config.py` | [Lines 50–54](file:///c:/ARMIET/Smart_City_Complaint_Management/backend/app/config.py#L50-L54) | `ALLOWED_CORS_ORIGINS` defaults to localhost only; rejects remote demo domains. |
| **FND-01** | `.gitattributes` | [Line 1](file:///c:/ARMIET/Smart_City_Complaint_Management/.gitattributes#L1) | Git LFS tracking on `best_model.pt` requires explicit pull during container image build. |
| **FND-02** | `backend/requirements.txt` | [Lines 20–21](file:///c:/ARMIET/Smart_City_Complaint_Management/backend/requirements.txt#L20-L21) | Pinned PyTorch packages pull 3 GB CUDA binaries without `--index-url cpu` directive. |
| **FND-03** | `frontend/src/pages/public/LoginPage.tsx` | [Line 36](file:///c:/ARMIET/Smart_City_Complaint_Management/frontend/src/pages/public/LoginPage.tsx#L36) | Hardcoded Supabase URL prevents environment parameterization. |
| **FND-04** | `frontend/src/pages/public/ContactPage.tsx` | [Lines 23–26](file:///c:/ARMIET/Smart_City_Complaint_Management/frontend/src/pages/public/ContactPage.tsx#L23-L26) | Simulated client-only submission on contact form. |
| **FND-05** | `backend/app/core/rate_limiter.py` | [Lines 10–25](file:///c:/ARMIET/Smart_City_Complaint_Management/backend/app/core/rate_limiter.py) | In-memory rate limiting state is unshared across horizontal Cloud Run instances. |
| **FND-06** | `frontend/src/pages/public/PrivacyPolicyPage.tsx` | [Line 66](file:///c:/ARMIET/Smart_City_Complaint_Management/frontend/src/pages/public/PrivacyPolicyPage.tsx#L66) | Policy copy says "SHA-256", backend implementation uses "BCrypt". |

---

## 7. Environment Variables Specification (Safe Examples)

### Cloudflare Pages (Frontend Build Environment)
| Variable Name | Required? | Example Value | Description |
| :--- | :---: | :--- | :--- |
| `VITE_API_BASE_URL` | **YES** | `https://civicpulse-api-xyz.a.run.app/api/v1` | Public Cloud Run API endpoint |
| `VITE_SUPABASE_URL` | **YES** | `https://sagibkveeaciobapkgrt.supabase.co` | Public Supabase project URL |

*Note: Never provide database URLs, service role keys, or backend secrets to Cloudflare Pages.*

### Google Cloud Run (Backend Container Environment)
| Variable Name | Required? | Example Value | Description |
| :--- | :---: | :--- | :--- |
| `PORT` | Auto | `8080` | Injected by Google Cloud Run automatically |
| `ENVIRONMENT` | **YES** | `staging` | Runtime environment identifier |
| `DATABASE_URL` | **YES** | `postgresql://[USER]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres` | Supabase PostgreSQL pooler string |
| `SECRET_KEY` | **YES** | `random-64-character-hex-string-for-jwt-signing` | High-entropy HS256 JWT signing secret |
| `SUPABASE_URL` | **YES** | `https://sagibkveeaciobapkgrt.supabase.co` | Supabase project URL for JWKS and Storage |
| `SUPABASE_KEY` | **YES** | `eyJhbGciOi...[SUPABASE_SERVICE_OR_ANON_KEY]` | Supabase client access key |
| `STORAGE_BACKEND` | **YES** | `supabase` | Directs uploads to private cloud bucket |
| `SUPABASE_STORAGE_BUCKET` | **YES** | `complaint-images` | Name of private object storage bucket |
| `ALLOWED_CORS_ORIGINS` | **YES** | `["https://civicpulse.infalex.com","https://project.infalex.com","http://localhost:5173"]` | JSON array of whitelisted web origins |
| `COOKIE_SECURE` | **YES** | `True` | Enforces HTTPS-only cookies in demo deployment |
| `COOKIE_SAMESITE` | **YES** | `none` | Cross-site cookie transmission for separate domains |
| `ACCESS_TOKEN_EXPIRE_MINUTES`| No | `180` | Session lifetime (defaults to 180 mins) |
| `AI_CONFIDENCE_THRESHOLD` | No | `0.80` | Triage confidence threshold for review queue |

---

## 8. Proposed Cloudflare Pages Build Settings

- **Framework Preset:** `Vite`
- **Root Directory:** `frontend`
- **Build Command:** `npm run build`
- **Build Output Directory:** `dist`
- **Node.js Version:** `20.x` or `22.x` (configured via `NODE_VERSION=20` environment variable)
- **Custom Domain Setup:**
  - Add custom domain: `civicpulse.infalex.com` or `project.infalex.com`.
  - Cloudflare automatically routes the CNAME and issues an edge SSL/TLS certificate.
- **Required File:** Create `frontend/public/_redirects`:
  ```
  /*    /index.html   200
  ```

---

## 9. Proposed Google Cloud Run Container & Resource Specifications

### Recommended Dockerfile
```dockerfile
# Use official lightweight Python 3.11 slim image
FROM python:3.11-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8080

WORKDIR /app

# Install minimal OS runtime packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Pre-install CPU-only PyTorch wheels (strips ~2.5 GB of CUDA bloat)
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Copy and install application dependencies (excluding CUDA torch packages)
COPY backend/requirements.txt /app/requirements.txt
RUN sed -i '/^torch/d' /app/requirements.txt && \
    pip install --no-cache-dir -r /app/requirements.txt

# Copy application source and ML weights
COPY backend/app /app/app
COPY backend/alembic /app/alembic
COPY backend/alembic.ini /app/alembic.ini

# Expose standard Cloud Run port
EXPOSE 8080

# Execute Uvicorn in single-worker mode listening on 0.0.0.0:$PORT
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1"]
```

### Cloud Run Deployment Parameters
| Parameter | Recommended Setting | Rationale |
| :--- | :--- | :--- |
| **CPU Allocation** | **1 vCPU** | CPU inference takes only ~73 ms. 1 vCPU is more than sufficient. |
| **Memory Allocation**| **1 GiB (or 2 GiB)** | Measured memory working set with model loaded is **~435.6 MB**. 1 GiB gives 580 MB headroom; 2 GiB provides abundance for concurrent image uploads. |
| **Min Instances** | **0** (or **1** during live demo) | Set to `0` for \$0 idle cost. Set to `1` thirty minutes before presenting to professor to eliminate cold starts. |
| **Max Instances** | **2** | Prevents unexpected cost runaway; 2 instances handle up to 40 concurrent users. |
| **Concurrency** | **20** | FastAPI async requests execute concurrently while PyTorch runs in worker thread pool. |
| **Request Timeout** | **60 seconds** | Image uploads and inference finish in <1.5s total. |
| **Execution Environment** | Second Generation | Full Linux ABI compatibility. |
| **Health Check Probe**| `GET /health` | Validates server readiness and model preloading. |

---

## 10. Required Supabase Configuration

### 1. Supabase Auth Configuration
- Navigate to **Authentication → URL Configuration** in the Supabase Dashboard:
  - **Site URL:** `https://civicpulse.infalex.com` (or `https://project.infalex.com`)
  - **Redirect URLs (Allowlist):**
    - `https://civicpulse.infalex.com/auth/callback`
    - `https://project.infalex.com/auth/callback`
    - `http://localhost:5173/auth/callback`

### 2. Google OAuth Provider (If using Google Sign-In)
- In **Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID**:
  - **Authorized Redirect URI:** Must be `https://sagibkveeaciobapkgrt.supabase.co/auth/v1/callback` (Google redirects to Supabase; Supabase then redirects to CivicPulse callback).

### 3. Supabase Storage Configuration
- Bucket: `complaint-images`
- Privacy: **Private** (Public bucket policy disabled).
- File Size Limit: **5 MB**.
- Allowed MIME Types: `image/jpeg`, `image/png`, `image/webp`.

---

## 11. Model Benchmark Results (Evidence-Based CPU Measurements)

Executed locally on CPU using the production checkpoint [`backend/app/ml/weights/best_model.pt`](file:///c:/ARMIET/Smart_City_Complaint_Management/backend/app/ml/weights/best_model.pt):

| Metric | Measured Value | Analysis & Cloud Run Feasibility |
| :--- | :---: | :--- |
| **Artifact Checkpoint Size** | **81,639,711 bytes (77.86 MB)** | Easily bundled inside container image; no external NFS/GCS bucket mounting needed. |
| **Model Initialization Time** | **356.79 ms (~0.36 s)** | Ultra-fast startup; adds negligible overhead to container cold-start time. |
| **Peak Process Working Set (RAM)**| **435.62 MB** | PyTorch runtime + model fits comfortably in a 1 GiB or 2 GiB Cloud Run container. |
| **Cold Warmup Inference Latency**| **98.37 ms** | First forward pass initializes PyTorch kernel caching in under 100 ms. |
| **Sequential Inference Latency** | **72.99 ms average** (min: 65.8 ms, max: 82.5 ms) | Sub-100ms CPU inference eliminates any need for costly GPU instances. |
| **Output Classes Verified** | `['damaged_road', 'garbage', 'pothole', 'streetlight_failure', 'water_leak']` | All 5 canonical categories predicted properly. |
| **Probability Distribution Sum** | **0.9999 (Valid)** | Softmax output forms a normalized probability distribution across categories. |
| **Corrupt Payload Failover** | Handled (`status: FAILED`, `error_message` captured) | Graceful error handling without process termination or uncaught 500 crashes. |
| **Missing Model File Failover** | Handled (`FileNotFoundError` caught) | Descriptive startup error if weights file is absent. |

---

## 12. Regression Risks and Security Findings

1. **Cold Start User Experience:** If Cloud Run scales to zero (`min-instances=0`), the first request after idle can take ~4–6 seconds (container pull + Python startup + model load).  
   *Mitigation:* Keep `min-instances=1` for the duration of the professor demonstration.
2. **PostgreSQL Session Pooler vs Scale-to-Zero:** If multiple Cloud Run instances terminate abruptly, lingering connections could briefly occupy slots in Supabase pooler.  
   *Mitigation:* Handled properly by `statement_cache_size=0` and `pool_pre_ping=True` in [`backend/app/db/session.py`](file:///c:/ARMIET/Smart_City_Complaint_Management/backend/app/db/session.py#L21-L27).
3. **Cross-Site Cookies on Separate Domains:** If the frontend is on `civicpulse.infalex.com` and the backend is on `*.run.app`, browser security prevents `SameSite=Lax` cookies from being sent cross-origin.  
   *Mitigation:* The frontend API client stores tokens in `localStorage` and transmits via `Authorization: Bearer <token>` header, completely bypassing third-party cookie restrictions.
4. **IDOR & Evidence Scoping:** Verified that unauthorized citizens cannot retrieve signed URLs or image blobs for complaints they do not own ([`backend/app/api/v1/files.py`](file:///c:/ARMIET/Smart_City_Complaint_Management/backend/app/api/v1/files.py#L51-L58)).
5. **Alembic Migration Race Condition:** Never run `alembic upgrade head` in parallel on multiple Cloud Run container instances. Run migrations as a controlled one-off command prior to deploying revisions.

---

## 13. Pre-Deployment Checklist

- [ ] **1. Refactor API Client:** Update `frontend/src/api/client.ts` line 15 to `const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";`.
- [ ] **2. Refactor Supabase Login URL:** Update `frontend/src/pages/public/LoginPage.tsx` line 36 to `const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://sagibkveeaciobapkgrt.supabase.co";`.
- [ ] **3. Add Cloudflare Redirects:** Create `frontend/public/_redirects` with content `/*  /index.html  200`.
- [ ] **4. Add Backend Dockerfile:** Place the CPU-optimized Dockerfile in repository root.
- [ ] **5. Pull Git LFS Artifacts:** Verify `git lfs pull` has downloaded the full 78 MB `best_model.pt` binary.
- [ ] **6. Build Local Container:** Execute `docker build -t civicpulse-backend .` and verify container starts cleanly.
- [ ] **7. Verify Supabase Redirects:** Add `https://civicpulse.infalex.com/auth/callback` to Supabase Auth allowlist.
- [ ] **8. Setup Cloudflare Pages:** Connect Git repository, set root directory to `frontend`, set `VITE_API_BASE_URL`, and bind custom subdomain.
- [ ] **9. Deploy Cloud Run Service:** Deploy container with 1 vCPU, 1 GiB (or 2 GiB) memory, and supply environment variables (`DATABASE_URL`, `SECRET_KEY`, `ALLOWED_CORS_ORIGINS`).

---

## 14. Post-Deployment Smoke-Test Checklist

- [ ] **1. Cloudflare Pages Root:** Open `https://civicpulse.infalex.com` and confirm landing page renders with zero console errors.
- [ ] **2. Direct Route Refresh:** Refresh `/track` and `/dashboard` to confirm Cloudflare SPA routing fallback functions without 404s.
- [ ] **3. Backend Health Check:** Open `https://civicpulse-api-xyz.run.app/health` and verify `status: "healthy"` and `ai_model_loaded: true`.
- [ ] **4. Citizen Sign-In:** Log in with `citizen@smartcity.gov` / `Citizen@SmartCity2026!` and verify citizen dashboard displays.
- [ ] **5. File a Complaint:** Upload a real photo of a pothole, enter test location, submit, and confirm:
  - AI predicts `pothole` with confidence score.
  - Complaint routes automatically to `Road Authority`.
  - Photo is uploaded to Supabase Storage.
  - Reference number and PIN are issued.
- [ ] **6. Evidence Viewing:** Open the created complaint and verify photo loads via `SecureEvidenceImage` (authenticated blob stream / signed URL).
- [ ] **7. Officer Workspace:** Log in as `officer.road@smartcity.gov` / `Officer@SmartCity2026!` and confirm the new case appears in the Road Authority queue.
- [ ] **8. Status Transition:** Advance status from `UNDER_REVIEW` to `ASSIGNED` to `IN_PROGRESS` and confirm timeline updates.
- [ ] **9. Admin Console:** Log in as `admin@smartcity.gov` / `Admin@SmartCity2026!` and verify department workload tables populate with live data.

---

## 15. Rollback and Recovery Plan

1. **Frontend Rollback (Cloudflare Pages):**
   - In Cloudflare Pages Dashboard → Deployments, select the previous working deployment and click **Rollback to this deployment**. Instant (<10s) edge traffic switch.
2. **Backend Rollback (Google Cloud Run):**
   - In GCP Console → Cloud Run → CivicPulse Service → Revisions, click on the previous revision and click **Route 100% Traffic to Revision**. Instant traffic migration without container rebuild.
3. **Database Recovery:**
   - A full SQLite snapshot exists at `backend/backups/smart_city_backup_20261010_194437.db`.
   - In the event of test data corruption, run `python scripts/migrate_sqlite_to_pg.py` to restore original clean demo state.
   - Live Supabase backups can also be restored via Supabase Dashboard Point-in-Time Recovery.

---

## 16. Assumptions and Unknowns Requiring Manual Confirmation

1. **DNS Delegation for `infalex.com`:** Assumes DNS for `infalex.com` is managed within Cloudflare. If managed elsewhere (e.g. GoDaddy/Namecheap), CNAME records for `civicpulse` must be pointed manually to `<project>.pages.dev`.
2. **GCP Project & Billing:** Assumes an active Google Cloud Platform project exists with Cloud Run API enabled. Cloud Run free tier provides 2 million free requests and 360,000 GB-seconds memory per month, which easily covers an academic demo.
3. **Google OAuth in Production:** If presenting Google OAuth specifically, the Google Cloud Console OAuth consent screen must have `civicpulse.infalex.com` configured and the Supabase callback URL in the authorized redirect URIs. If unverified, email/password logins (`citizen@smartcity.gov`, `officer.road@smartcity.gov`, `admin@smartcity.gov`) function immediately.
4. **Supabase Ingress Network:** Assumes the Supabase project region (`aws-0-ap-northeast-1` Tokyo) has network egress permitted from Google Cloud Run (standard open Internet egress on Cloud Run default VPC).

---

## 17. Prioritized Next Actions

```
[Priority 1: Code Adjustments]
1. Refactor frontend API client base URL to support VITE_API_BASE_URL (frontend/src/api/client.ts).
2. Parameterize Supabase URL in LoginPage.tsx with VITE_SUPABASE_URL.
3. Create frontend/public/_redirects with `/*  /index.html  200`.

[Priority 2: Containerization]
4. Create the CPU-optimized Dockerfile in the repository root.
5. Create .dockerignore to exclude .git, venv, node_modules, and cache directories.

[Priority 3: Cloud Provisioning]
6. Build and push Docker container to GCP Artifact Registry / Container Registry.
7. Deploy Cloud Run service with 1 vCPU, 1 GiB (or 2 GiB) RAM, and inject environment variables.
8. Connect Cloudflare Pages to the frontend directory with VITE_API_BASE_URL set to Cloud Run URL.
9. Bind custom domain (e.g. civicpulse.infalex.com) on Cloudflare Pages.
10. Update Supabase Auth URL Configuration and CORS allowlist with the deployed domain.

[Priority 4: Validation]
11. Execute post-deployment smoke test checklist (Section 14).
```

---

## 18. Final Recommendation

**RECOMMENDATION:** **PROCEED WITH DEMO DEPLOYMENT FOLLOWING THE 5 PRE-DEPLOYMENT PREREQUISITES.**

The proposed architecture (**Cloudflare Pages + Google Cloud Run CPU + Supabase**) is exceptionally well suited for this academic demonstration:
- **Cost:** Virtually **\$0.00** (well within Cloudflare Pages free tier, Cloud Run free tier, and Supabase free tier).
- **Performance:** **~73 ms CPU inference** ensures responsive AI classification without GPU costs.
- **Reliability:** Serverless architecture automatically handles traffic and recovers from idle without managing server infrastructure.
- **Security:** Private evidence storage, parameterized SQL, role-based authorization, and token-based client headers ensure appropriate security for real accounts.
