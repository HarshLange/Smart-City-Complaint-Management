# CivicPulse — Academic Demo Deployment Guide

This guide provides end-to-end instructions for deploying the **CivicPulse Smart City Complaint Management System** in a restricted staging/demo environment.

---

## 1. Architecture & Deployment Topology

```
+---------------------------------------------------------------------------------------+
|                                    DEMO TOPOLOGY                                      |
+---------------------------------------------------------------------------------------+
|                                                                                       |
|   User / Professor / Reviewer                                                         |
|             │                                                                         |
|             ├── HTTPS (DNS: Cloudflare)                                               |
|             ▼                                                                         |
|   [ Cloudflare Pages ] ─── Frontend (React 19 + Vite + TypeScript)                    |
|       Domain: https://civicpulse.infalex.com                                          |
|       SPA Routing: frontend/public/_redirects (200 rewrite to /index.html)            |
|             │                                                                         |
|             ├── REST API Calls (Authorization: Bearer <JWT>)                          |
|             ▼                                                                         |
|   [ Google Cloud Run ] ─── Backend (FastAPI + PyTorch CPU + Uvicorn)                  |
|       Container: Dockerfile (python:3.11-slim + torch-cpu + best_model.pt)            |
|       Endpoint: https://civicpulse-backend-xyz.a.run.app                              |
|             │                                                                         |
|             ├── Async Database Sessions (asyncpg via Session Pooler :5432)            |
|             ▼                                                                         |
|   [ Supabase PostgreSQL ] ─── Database Persistence (AWS Tokyo Pooler)                |
|       Host: aws-0-ap-northeast-1.pooler.supabase.com:5432                             |
|                                                                                       |
|             ├── S3-compatible Private Blob Storage                                    |
|             ▼                                                                         |
|   [ Supabase Storage ] ─── Private Bucket: complaint-images                           |
|       Uploads: Backend Python SDK (Service Role)                                      |
|       Downloads: Proxied via /api/v1/files/evidence/... (RBAC-enforced)               |
|                                                                                       |
|             ├── OAuth Redirection & Session Management                                |
|             ▼                                                                         |
|   [ Supabase Auth & Google OAuth ] ─── Citizen Identity                               |
|       Redirect: https://civicpulse.infalex.com/auth/callback                          |
+---------------------------------------------------------------------------------------+
```

---

## 2. Pre-Deployment Prerequisites

### 2.1 Accounts & Permissions
- **Google Cloud Platform (GCP):** Billing-enabled project with **Cloud Run Admin** and **Cloud Build Editor** roles.
- **Cloudflare:** Account managing the DNS zone for `infalex.com`.
- **Supabase:** Existing project (`sagibkveeaciobapkgrt.supabase.co`) with database credentials and service-role key.

### 2.2 CLI Tools
Install and authenticate the following tools on your administrative machine:
- `gcloud` CLI: `gcloud auth login` and `gcloud config set project [YOUR_GCP_PROJECT_ID]`
- `git` with Git LFS: Ensure Git LFS is installed (`git lfs --version`).
- `node` 20+ and `npm` 10+ (for local builds and tests).

### 2.3 Verify Model Checkpoint
Before building the container, verify that `backend/app/ml/weights/best_model.pt` contains the real binary weights (~78 MB), not a Git LFS pointer:
```powershell
# PowerShell verification
(Get-Item backend/app/ml/weights/best_model.pt).Length
# Expected: ~81,639,711 bytes (> 50 MB)
```
If the file size is ~130 bytes, run:
```bash
git lfs install
git lfs pull
```

---

## 3. Backend Deployment (Google Cloud Run)

### 3.1 Enable Required GCP Services
Run once in your GCP project:
```bash
gcloud services enable \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    containerregistry.googleapis.com \
    secretmanager.googleapis.com
```

### 3.2 Build Container Image using Google Cloud Build
Because the local environment may not have a running Docker daemon, build the container image directly in the cloud using Google Cloud Build:
```bash
# Run from repository root (C:\ARMIET\Smart_City_Complaint_Management)
gcloud builds submit \
    --tag gcr.io/[PROJECT_ID]/civicpulse-backend:v1 \
    --timeout=20m \
    .
```
*Note: The root `Dockerfile` automatically downloads the lightweight CPU-only PyTorch wheels (~160 MB vs ~2.5 GB CUDA wheels) and verifies the model checkpoint integrity during the build.*

### 3.3 Deploy to Google Cloud Run
Deploy the container with CPU and memory limits tailored for the EfficientNetV2-S model:

```bash
gcloud run deploy civicpulse-backend \
    --image gcr.io/[PROJECT_ID]/civicpulse-backend:v1 \
    --platform managed \
    --region asia-south1 \
    --allow-unauthenticated \
    --memory 2Gi \
    --cpu 2 \
    --concurrency 20 \
    --min-instances 0 \
    --max-instances 3 \
    --timeout 60s \
    --port 8080 \
    --set-env-vars "\
ENVIRONMENT=staging,\
DEBUG=false,\
COOKIE_SECURE=true,\
COOKIE_SAMESITE=lax,\
STORAGE_BACKEND=supabase,\
SUPABASE_STORAGE_BUCKET=complaint-images,\
ALLOWED_CORS_ORIGINS=https://civicpulse.infalex.com\,https://project.infalex.com\,http://localhost:5173,\
DATABASE_URL=postgresql+asyncpg://postgres.[REF]:[DB_PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres,\
SUPABASE_URL=https://sagibkveeaciobapkgrt.supabase.co,\
SUPABASE_KEY=[SUPABASE_SERVICE_ROLE_KEY],\
SECRET_KEY=[RANDOM_64_CHAR_SECRET_KEY]"
```

> **Security Tip:** For enhanced security in production, store `DATABASE_URL`, `SUPABASE_KEY`, and `SECRET_KEY` in **GCP Secret Manager** and reference them via `--set-secrets`.

### 3.4 Verify Cloud Run Health
Note the assigned Service URL (e.g., `https://civicpulse-backend-xyz.a.run.app`). Test the health endpoint:
```bash
curl -i https://civicpulse-backend-xyz.a.run.app/health
# Expected Response:
# HTTP/1.1 200 OK
# {"status":"healthy","database":"connected","ai_model":"loaded","storage":"supabase"}
```

---

## 4. Frontend Deployment (Cloudflare Pages)

### 4.1 Create Cloudflare Pages Project
1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Compute (Workers & Pages)** > **Create application** > **Pages** > **Connect to Git**.
3. Select your repository: `HarshLange/Smart-City-Complaint-Management`.

### 4.2 Configure Build Settings
Fill in the build configuration fields:
- **Project name:** `civicpulse`
- **Framework preset:** `Vite`
- **Root directory:** `frontend`
- **Build command:** `npm run build`
- **Build output directory:** `dist`

### 4.3 Configure Build Environment Variables
In the Cloudflare Pages project settings, add the following variables:

| Variable Name | Example Value | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `https://civicpulse-backend-xyz.a.run.app/api/v1` | Full backend URL including `/api/v1` prefix |
| `VITE_SUPABASE_URL` | `https://sagibkveeaciobapkgrt.supabase.co` | Supabase URL for public OAuth redirection |

### 4.4 Configure Custom Domain
1. In the Pages project, go to **Custom domains** > **Set up a custom domain**.
2. Enter: `civicpulse.infalex.com` (or `project.infalex.com`).
3. Cloudflare will automatically provision the SSL certificate and add the DNS CNAME record.

### 4.5 Verify SPA Routing
Cloudflare Pages uses `frontend/public/_redirects` (which Vite copies to `dist/_redirects`). Confirm that direct links (such as `/login`, `/complaints/track`, `/departments`) load the single-page application without 404 errors on refresh.

---

## 5. Supabase Configuration Alignment

### 5.1 Authentication Redirect URLs
1. Navigate to the Supabase Dashboard: `https://supabase.com/dashboard/project/sagibkveeaciobapkgrt`.
2. Go to **Authentication** > **URL Configuration**.
3. Set **Site URL** to:
   ```
   https://civicpulse.infalex.com
   ```
4. Add the following entries to **Redirect URLs**:
   ```
   https://civicpulse.infalex.com
   https://civicpulse.infalex.com/auth/callback
   http://localhost:5173
   http://localhost:5173/auth/callback
   ```
5. Click **Save**.

### 5.2 Google OAuth Alignment
If Google OAuth is active:
1. In Google Cloud Console > **APIs & Services** > **Credentials** > your OAuth 2.0 Client ID:
2. Ensure **Authorized JavaScript origins** includes:
   ```
   https://civicpulse.infalex.com
   https://sagibkveeaciobapkgrt.supabase.co
   ```
3. Ensure **Authorized redirect URIs** includes:
   ```
   https://sagibkveeaciobapkgrt.supabase.co/auth/v1/callback
   ```

### 5.3 Storage Bucket Access
1. Go to **Storage** > **Buckets** in Supabase.
2. Confirm the `complaint-images` bucket exists and is marked **Private**.
3. All citizen evidence is fetched through the authenticated backend proxy (`/api/v1/files/evidence/...`), so the bucket should **not** be public.

---

## 6. End-to-End Demo Verification Checklist

Before presenting to the professor, execute this verification runbook:

- [ ] **1. Backend Health Check:** `curl https://civicpulse-backend-xyz.a.run.app/health` returns status `healthy` with database and model loaded.
- [ ] **2. Frontend Initial Load:** Navigate to `https://civicpulse.infalex.com`. Landing page renders with stats, category shortcuts, and navigation links.
- [ ] **3. SPA Direct Routing:** Refresh `https://civicpulse.infalex.com/faq` and `https://civicpulse.infalex.com/terms`. Confirm no 404 error occurs.
- [ ] **4. Google OAuth / Password Login:** Log in as citizen or officer. Confirm JWT is saved and user avatar appears in header.
- [ ] **5. File Upload & Classification:**
  - Submit a test complaint with a clear pothole or garbage photo.
  - Confirm the PyTorch EfficientNetV2-S model infers the category on CPU in <1.5 seconds.
  - Verify auto-routing matches the category (e.g. `pothole` -> Road Authority; `garbage` -> Sanitation).
  - Copy the generated Reference Number (e.g. `REF-20261010-XXXXXX`) and Tracking PIN.
- [ ] **6. Public Tracking:**
  - Open an Incognito window.
  - Go to `https://civicpulse.infalex.com/complaints/track`.
  - Enter the reference number and PIN.
  - Verify complaint timeline and details render correctly.
- [ ] **7. Officer Workspace & Status Transition:**
  - Log in as the assigned department officer.
  - Transition status from `submitted` to `in_progress` and then `resolved`.
  - Confirm timeline updates immediately.
- [ ] **8. Evidence Image Security:**
  - In the complaint detail page, verify the photo renders via the secure proxy.
  - Copy the image URL and test accessing it without an auth token / session; confirm access is denied.

---

## 7. Demo Day Tips & Cost Management

### Eliminating Cold Starts During the Presentation
Google Cloud Run scales to zero instances by default when idle. The first request after idle can take ~6-9 seconds while the Python runtime and PyTorch model load into container memory.

**15 minutes before your demo:**
```bash
# Temporarily set min-instances to 1
gcloud run services update civicpulse-backend \
    --region asia-south1 \
    --min-instances 1
```
*This keeps one warm container in memory, guaranteeing instantaneous sub-100ms API responses during your presentation.*

**Immediately after the presentation:**
```bash
# Return to zero min-instances to prevent billing
gcloud run services update civicpulse-backend \
    --region asia-south1 \
    --min-instances 0
```

### Rollback Procedures
- **Backend:** In Cloud Run > **Revisions**, select the previous revision and click **Manage Traffic** to revert in 5 seconds.
- **Frontend:** In Cloudflare Pages > **Deployments**, select the previous deployment and click **Rollback to this deployment**.
