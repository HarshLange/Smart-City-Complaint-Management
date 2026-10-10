# CivicPulse — Final Deployment Readiness Audit & Go/No-Go Decision Report

**Target Project:** CivicPulse — Smart City Complaint Management System  
**Workspace:** `C:\ARMIET\Smart_City_Complaint_Management`  
**Repository:** `https://github.com/HarshLange/Smart-City-Complaint-Management`  
**Audit Date:** October 10, 2026  
**Auditor Roles:** Senior Software Release Engineer, Application Security Auditor, QA Lead, DevOps Engineer  

---

## A. Executive Verdict

| Target Environment | Decision | Justification |
| :--- | :---: | :--- |
| **1. Local Development & Testing** | **GO** | Frontend builds cleanly with zero TypeScript errors. Backend starts reliably with Uvicorn, loads the EfficientNetV2-S PyTorch model in evaluation mode, connects to PostgreSQL pooler, and passes all 34 automated unit and integration tests (100% pass rate). Core developer workflows operate as intended. |
| **2. Restricted Demo / Staging** | **CONDITIONAL GO** | Suitable for internal municipal evaluation under controlled conditions. Database persistence, private evidence storage, role-based application shell, complaint lifecycle transitions, and administrator management operate against real backend endpoints. **Conditions:** Deployment must be hosted under a single origin or with a reverse proxy due to hardcoded `/api/v1` client base URLs; Google OAuth requires domain verification in an interactive browser; placeholder municipal contacts must be communicated to reviewers as illustrative. |
| **3. Public Production** | **NO-GO** | Not ready for public production deployment. Production domain, host infrastructure, SSL certificate termination, and CORS configuration are undefined; `COOKIE_SECURE` is currently set to `False`; database disaster recovery restoration remains unproven; legal and statutory claims (WCAG 2.2 AA certification, DPDP Act compliance, emergency numbers) require official municipal verification; and the public citizen contact form is currently a client-side mock. |

---

## B. Verification Evidence

### 1. Frontend Build & Static Checks
- **Method:** Executed `npm run build` (`tsc -b && vite build`) in `frontend/`.
- **Command:** `npm run build`
- **Result:** **PASS**
- **Evidence:** 1629 modules transformed. Generated `dist/index.html` (0.84 kB), `dist/assets/index-C3nNHExS.css` (39.77 kB), and `dist/assets/index-C2zmgOYQ.js` (548.48 kB). Built in 5.01s with exit code 0.
- **Code Path:** [`frontend/package.json`](file:///c:/ARMIET/Smart_City_Complaint_Management/frontend/package.json), [`frontend/vite.config.ts`](file:///c:/ARMIET/Smart_City_Complaint_Management/frontend/vite.config.ts)
- **Limitations:** No `npm run lint` script is configured in `package.json`.

### 2. Frontend Production Bundle Secret Scanning
- **Method:** Automated regex pattern scan across `frontend/dist/assets/index-C2zmgOYQ.js` targeting leaked credentials (`service_role`, `SECRET_KEY`, `DATABASE_URL`, hardcoded passwords).
- **Command:** PowerShell regex pattern extraction on JS bundle.
- **Result:** **PASS**
- **Evidence:** Zero matches for `service_role`, `SECRET_KEY`, or `DATABASE_URL`. Password occurrences in the bundle are restricted exclusively to standard form input attributes (`type="password"`) and payload parameter names.
- **Code Path:** `frontend/dist/assets/index-C2zmgOYQ.js`
- **Limitations:** Minified client bundle inspection.

### 3. Backend Automated Test Suite Execution
- **Method:** Executed complete pytest test suite across all 6 test modules using isolated SQLite test fixtures with Pillow and PyTorch preloading.
- **Command:** `$env:PYTHONPATH="."; python -m pytest tests/ -v`
- **Result:** **PASS** (34/34 passed in 57.31s)
- **Breakdown:**
  - `tests/test_auth.py`: 7 passed (registration privilege isolation, duplicate rejection, login, profile retrieval, expired token rejection, claim elevation prevention, ES256 verification).
  - `tests/test_complaints.py`: 2 passed (submission & tracking, ownership isolation).
  - `tests/test_department_isolation.py`: 2 passed (cross-department access prevention, invalid status transition rejection).
  - `tests/test_ml_inference.py`: 4 passed (real model loading, deterministic routing, real inference execution, corrupted byte failover).
  - `tests/test_security_and_admin.py`: 6 passed (citizen admin rejection, officer provisioning & analytics, upload validation, path traversal prevention, department CRUD, identical state transition rejection).
  - `tests/test_storage.py`: 13 passed (Supabase client init, cloud upload, error handling, local mode, byte validation, MIME rejection, size limits, signed URLs, missing object handling, path traversal, rollback cleanup, logging).
- **Code Path:** [`backend/tests/`](file:///c:/ARMIET/Smart_City_Complaint_Management/backend/tests)

### 4. Backend Server Startup & Health Diagnostic
- **Method:** Started FastAPI backend on `127.0.0.1:8000` via Uvicorn and issued HTTP GET request to `/health`.
- **Command:** `Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -Method Get`
- **Result:** **PASS**
- **Evidence:** Server process started. Output:
  ```json
  {
    "status": "healthy",
    "service": "Smart City Complaint Management System",
    "environment": "development",
    "ai_model_loaded": true,
    "ai_model_name": "EfficientNetV2-S",
    "ai_confidence_threshold": 0.8
  }
  ```
- **Code Path:** [`backend/app/main.py`](file:///c:/ARMIET/Smart_City_Complaint_Management/backend/app/main.py#L94-L105)

### 5. PostgreSQL Schema & Alembic State Integrity
- **Method:** Queried Alembic revision history and current head status against live database.
- **Command:** `alembic history; alembic current`
- **Result:** **PASS**
- **Evidence:** Current context detected `PostgresqlImpl`, head revision `095500de9e84` matches active schema. Startup verified that `Base.metadata.create_all()` is NOT executed in PostgreSQL mode.
- **Code Path:** [`backend/alembic/versions/095500de9e84_initial_schema.py`](file:///c:/ARMIET/Smart_City_Complaint_Management/backend/alembic/versions/095500de9e84_initial_schema.py), [`backend/app/main.py`](file:///c:/ARMIET/Smart_City_Complaint_Management/backend/app/main.py#L27-L33)

### 6. Live PostgreSQL Data Retrieval & Persistence
- **Method:** Authenticated as Administrator and retrieved live migrated complaint record `REF-20261010-GKLBTV` (`bc499674-2903-4bdb-b840-809dafb8e101`).
- **Command:** `GET /api/v1/complaints/bc499674-2903-4bdb-b840-809dafb8e101`
- **Result:** **PASS**
- **Evidence:** Successfully returned:
  - Title: "Huge Garbage Dumped on River bank"
  - Reference: `REF-20261010-GKLBTV`
  - Status: `ASSIGNED`
  - Department: Garbage Department
  - AI Category: `garbage` (Confidence: 0.8747)
  - Attachment: `complaints/0984a560-d80d-4f17-a5b0-81a8fce3ad12.jpg`
- **Code Path:** [`backend/app/api/v1/complaints.py`](file:///c:/ARMIET/Smart_City_Complaint_Management/backend/app/api/v1/complaints.py#L260-L284)

### 7. Supabase Storage Signed URL Generation in Runtime
- **Method:** Generated time-limited pre-signed URL for live attachment `complaints/0984a560-d80d-4f17-a5b0-81a8fce3ad12.jpg`.
- **Command:** `GET /api/v1/files/signed-url?path=complaints/0984a560-d80d-4f17-a5b0-81a8fce3ad12.jpg`
- **Result:** **PASS**
- **Evidence:** Returned valid signed URL from `https://sagibkveeaciobapkgrt.supabase.co/storage/v1/object/sign/complaint-images/...` with `expires_in: 300` seconds.
- **Code Path:** [`backend/app/api/v1/files.py`](file:///c:/ARMIET/Smart_City_Complaint_Management/backend/app/api/v1/files.py#L69-L100), [`backend/app/services/storage_service.py`](file:///c:/ARMIET/Smart_City_Complaint_Management/backend/app/services/storage_service.py#L203-L241)

### 8. Live Administrator Department Management API
- **Method:** Authenticated administrative call to retrieve live departments enriched with officer and complaint workloads.
- **Command:** `GET /api/v1/admin/departments`
- **Result:** **PASS**
- **Evidence:** Returned 4 active departments:
  - `GARBAGE_DEPT` (Officers: 1, Active Complaints: 1)
  - `INFRASTRUCTURE` (Officers: 1, Active Complaints: 0)
  - `ROAD_AUTHORITY` (Officers: 1, Active Complaints: 1)
  - `WATER_DEPT` (Officers: 1, Active Complaints: 0)
- **Code Path:** [`backend/app/api/v1/admin.py`](file:///c:/ARMIET/Smart_City_Complaint_Management/backend/app/api/v1/admin.py#L340-L378)

### 9. Interactive Google OAuth Browser Flow
- **Method:** Browser-driven OAuth redirection, consent screen authorization, and callback handling.
- **Command:** N/A (Headless CLI environment without interactive desktop browser session or external Google credentials).
- **Result:** **BLOCKED / NOT VERIFIED**
- **Evidence:** Redirection endpoint verified (`https://sagibkveeaciobapkgrt.supabase.co/auth/v1/authorize?provider=google&redirect_to=...`), `AuthCallbackPage.tsx` StrictMode execution guard verified via static code analysis. Interactive Google user login blocked.
- **Code Path:** [`frontend/src/pages/public/LoginPage.tsx`](file:///c:/ARMIET/Smart_City_Complaint_Management/frontend/src/pages/public/LoginPage.tsx#L35-L39), [`frontend/src/pages/public/AuthCallbackPage.tsx`](file:///c:/ARMIET/Smart_City_Complaint_Management/frontend/src/pages/public/AuthCallbackPage.tsx)

### 10. Database Disaster Recovery Drill
- **Method:** Backup restoration and validation onto an isolated secondary database target.
- **Command:** N/A (No secondary staging database target allocated; destructive restore over active Supabase PostgreSQL prohibited).
- **Result:** **NOT VERIFIED**
- **Evidence:** SQLite backup verified at `backend/backups/smart_city_backup_20261010_194437.db` (172,032 bytes). Restoration drill to secondary PostgreSQL target unproven.
- **Code Path:** `backend/backups/`

---

## C. Test Summary

| Category | Total Executed | Passed | Failed | Blocked / Not Verified | Pass Rate |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Frontend Compilation & Build** | 1 | 1 | 0 | 0 | 100% |
| **Backend Unit & Isolation Tests** | 21 | 21 | 0 | 0 | 100% |
| **Backend Integration & Storage Tests** | 13 | 13 | 0 | 0 | 100% |
| **Live Database & API Runtime Tests** | 5 | 5 | 0 | 0 | 100% |
| **Interactive OAuth Browser Scenarios** | 1 | 0 | 0 | 1 (Blocked) | N/A |
| **Database Recovery Restoration Drill** | 1 | 0 | 0 | 1 (Not Verified) | N/A |
| **Total Test Checks** | **42** | **40** | **0** | **2** | **95.2% (100% of runnable)** |

---

## D. Defect Register

### Finding DEF-01: Hardcoded Relative API Base URL in Client
- **Severity:** **HIGH**
- **Description:** In [`frontend/src/api/client.ts`](file:///c:/ARMIET/Smart_City_Complaint_Management/frontend/src/api/client.ts#L15), `const API_BASE = "/api/v1";` is hardcoded without referencing `import.meta.env.VITE_API_BASE_URL`.
- **Reproduction Steps:** Inspect `frontend/src/api/client.ts`. Build the application and deploy frontend to a static host (e.g. Vercel) while backend runs on a distinct origin (e.g. `api.smartcity.gov`).
- **Evidence:** Line 15: `const API_BASE = "/api/v1";`.
- **Impact:** In multi-origin deployments without a reverse proxy, all frontend API calls route to the static frontend host and fail with 404.
- **Affected Module:** `frontend/src/api/client.ts`
- **Required Remediation:** Update `API_BASE` to `import.meta.env.VITE_API_BASE_URL || "/api/v1"`.
- **Release Impact:** Blocks public production on separate origins; does not block local development or single-origin staging.

### Finding DEF-02: Hardcoded Supabase URL in Frontend Login
- **Severity:** **MEDIUM**
- **Description:** In [`frontend/src/pages/public/LoginPage.tsx`](file:///c:/ARMIET/Smart_City_Complaint_Management/frontend/src/pages/public/LoginPage.tsx#L36), `const supabaseUrl = "https://sagibkveeaciobapkgrt.supabase.co";` is hardcoded.
- **Reproduction Steps:** Search for `supabaseUrl` in `frontend/src/pages/public/LoginPage.tsx`.
- **Evidence:** Line 36: `const supabaseUrl = "https://sagibkveeaciobapkgrt.supabase.co";`.
- **Impact:** Switching Supabase projects or setting up an isolated staging project requires code modifications instead of environment variable changes.
- **Affected Module:** `frontend/src/pages/public/LoginPage.tsx`
- **Required Remediation:** Bind to `import.meta.env.VITE_SUPABASE_URL || "https://sagibkveeaciobapkgrt.supabase.co"`.
- **Release Impact:** Blocks multi-environment configuration hygiene; does not block demo on the current project.

### Finding DEF-03: Tracking Page Authentication Inconsistency Between Frontend and Backend
- **Severity:** **MEDIUM**
- **Description:** Frontend [`TrackComplaintPage.tsx`](file:///c:/ARMIET/Smart_City_Complaint_Management/frontend/src/pages/public/TrackComplaintPage.tsx#L37-L42) redirects unauthenticated visitors to `/login?redirect=/track`, but backend [`POST /api/v1/complaints/track`](file:///c:/ARMIET/Smart_City_Complaint_Management/backend/app/api/v1/complaints.py#L194) remains open to anyone possessing a valid reference number and 6-digit PIN.
- **Reproduction Steps:** Issue an unauthenticated POST request directly to `/api/v1/complaints/track` with valid credentials.
- **Evidence:** Request succeeds and returns sanitized tracking data without `Authorization` header.
- **Impact:** Architectural ambiguity: frontend treats tracking as an authenticated citizen service, while backend treats it as a public reference/PIN lookup.
- **Affected Module:** `backend/app/api/v1/complaints.py`, `frontend/src/pages/public/TrackComplaintPage.tsx`
- **Required Remediation:** Align specifications. If tracking must be strictly authenticated, add `current_user: User = Depends(get_current_user)` to `/api/v1/complaints/track`. If public PIN tracking is desired, relax the frontend redirect.
- **Release Impact:** Non-blocking for demo; requires product alignment before public release.

### Finding DEF-04: Client-Side Mock Citizen Contact Form
- **Severity:** **MEDIUM**
- **Description:** In [`frontend/src/pages/public/ContactPage.tsx`](file:///c:/ARMIET/Smart_City_Complaint_Management/frontend/src/pages/public/ContactPage.tsx#L23-L26), submitting the citizen general inquiry form only sets local component state `submitted = true` without calling any API endpoint.
- **Reproduction Steps:** Fill out the inquiry form at `/contact` and submit.
- **Evidence:** Lines 23-26: `handleSubmit = (e) => { e.preventDefault(); setSubmitted(true); }`.
- **Impact:** Citizens attempting to submit inquiries receive a false confirmation of receipt, but the message is discarded.
- **Affected Module:** `frontend/src/pages/public/ContactPage.tsx`
- **Required Remediation:** Connect to a dedicated backend inquiry endpoint or mailer webhook, or replace the interactive form with direct department contact emails.
- **Release Impact:** Blocks public production; non-blocking for restricted demo if labeled illustrative.

### Finding DEF-05: Factual Algorithm Discrepancy in Published Privacy Policy
- **Severity:** **LOW**
- **Description:** [`PrivacyPolicyPage.tsx`](file:///c:/ARMIET/Smart_City_Complaint_Management/frontend/src/pages/public/PrivacyPolicyPage.tsx#L66) states: *"Plaintext tracking PINs are never stored; only salted SHA-256 password-grade hashes are preserved in our PostgreSQL database."* In reality, the backend uses BCrypt with 12 salt rounds (`hash_password` in `app/core/security.py`).
- **Reproduction Steps:** Compare `PrivacyPolicyPage.tsx` line 66 with `app/core/security.py` line 118 (`hash_tracking_pin` calls `hash_password`).
- **Evidence:** `hash_tracking_pin` utilizes BCrypt, not SHA-256.
- **Impact:** Inaccurate technical statement in legal documentation (BCrypt is cryptographically superior to SHA-256, but the document should accurately reflect the implementation).
- **Affected Module:** `frontend/src/pages/public/PrivacyPolicyPage.tsx`
- **Required Remediation:** Update text to state "salted BCrypt password-grade hashes".
- **Release Impact:** Non-blocking.

### Finding DEF-06: Production Environment Variables & Security Cookies Default to Development
- **Severity:** **HIGH**
- **Description:** In [`backend/app/config.py`](file:///c:/ARMIET/Smart_City_Complaint_Management/backend/app/config.py#L23-L54), `SECRET_KEY` has a placeholder default, `COOKIE_SECURE` defaults to `False`, and `ALLOWED_CORS_ORIGINS` only whitelists `localhost:5173`, `127.0.0.1:5173`, and `localhost:3000`.
- **Reproduction Steps:** Inspect `backend/app/config.py` lines 23-55.
- **Evidence:** Default configuration allows non-HTTPS cookies and blocks cross-origin production hosts.
- **Impact:** If deployed to production without overriding these variables in production `.env`, cookies are vulnerable to interception and legitimate frontend origins will be blocked by CORS.
- **Affected Module:** `backend/app/config.py`
- **Required Remediation:** Ensure production deployment environment defines high-entropy `SECRET_KEY`, `COOKIE_SECURE=True`, `ENVIRONMENT=production`, and explicit production `ALLOWED_CORS_ORIGINS`.
- **Release Impact:** Blocks public production.

---

## E. Security Findings

| Category | Assessment | Evidence & Verdict |
| :--- | :--- | :--- |
| **Authentication & Tokens** | Strong | Server validates JWTs using BCrypt and asymmetric Supabase JWKS (ES256/RS256). Expired and altered tokens are rejected with 401. Tokens are not trusted for role elevation. |
| **Role-Based Authorization (RBAC)** | Strong | Enforced via server-side dependencies (`require_admin`, `require_officer`, `require_citizen`). Registration hardcodes `UserRole.CITIZEN`. Officer actions enforce department scoping (`actor.department_id == complaint.department_id`). |
| **IDOR / BOLA Protections** | Strong | `GET /complaints/{id}` verifies citizen ownership or officer department scoping. Unauthorized requests receive 403 Forbidden. Internal officer notes are redacted for citizens. |
| **File Storage & Path Traversal** | Strong | Path traversal sequences (`..`, leading `/`) are rejected with `400 PATH_TRAVERSAL_DETECTED`. Private bucket objects are inaccessible without an authenticated session or time-limited signed URL. |
| **Compensating Rollback** | Strong | If a database transaction fails after an image upload, `complaint_service.py` deletes the orphaned file from Supabase Storage and rolls back the transaction. |
| **Secrets Exposure** | Clean | Zero credentials or service keys in git history or client bundles. `.env` is ignored by git. |
| **Rate Limiting** | Active | In-memory sliding window rate limiters protect login (5/min), submission (10/min), and tracking (30/min). |

---

## F. Deployment Configuration

### Verified in Current Environment:
1. **Database:** Supabase PostgreSQL session pooler (`aws-0-ap-northeast-1.pooler.supabase.com:5432`) connected via SQLAlchemy `asyncpg` driver.
2. **Storage:** Supabase Storage private bucket `complaint-images` using the Python Supabase SDK.
3. **AI Runtime:** PyTorch EfficientNetV2-S preloaded on startup from local model weights (`best_model.pt`).
4. **Local Proxy:** Vite reverse proxy routing `/api` to `127.0.0.1:8000`.

### Unverified / Pending Production Specification:
1. **Production Hosting Target:** Unknown (e.g. Docker container, AWS ECS, GCP Cloud Run, Render, Vercel).
2. **Production Domain & SSL:** Unknown (HTTPS certificate authority, custom domain).
3. **CORS Allowlist:** Only localhost entries configured in default settings.
4. **Monitoring & Alerting:** No Sentry, Prometheus, or Datadog instrumentation configured.
5. **Database Recovery:** SQLite backup verified on disk, but restoration drill onto PostgreSQL staging remains unperformed.

---

## G. Final Go/No-Go Recommendation

### 1. Blocking Issues for Public Production Deployment:
1. **Dynamic API Base URL:** Configure `VITE_API_BASE_URL` in `frontend/src/api/client.ts` to allow cross-origin production hosting.
2. **Production Secrets & Security Settings:** Set high-entropy `SECRET_KEY`, `COOKIE_SECURE=True`, `ENVIRONMENT=production`, and production domain in `ALLOWED_CORS_ORIGINS`.
3. **Citizen Inquiry Form:** Connect `/contact` form to a real backend persistence or ticketing pipeline.
4. **Authoritative Claim Verification:** Qualify or verify municipal contact information, emergency numbers, and WCAG accessibility statements with municipal stakeholders.

### 2. Important But Non-Blocking Issues for Staging:
1. **Supabase URL Environment Variable:** Refactor hardcoded URL in `LoginPage.tsx` to `import.meta.env.VITE_SUPABASE_URL`.
2. **Tracking Specification Alignment:** Decide whether tracking should require a citizen login or remain open via reference number + PIN.
3. **Privacy Policy Typo:** Correct "SHA-256" to "BCrypt" in `PrivacyPolicyPage.tsx`.

### 3. Checks Blocked by Missing Access:
1. **Interactive Google OAuth E2E Flow:** Requires interactive browser and valid Google user account.
2. **PostgreSQL Disaster Recovery Drill:** Requires a secondary isolated PostgreSQL database.

---

## H. Manual Verification Guide for Developers

### Manual Test 1: Interactive Google OAuth Verification
1. Launch backend: `$env:PYTHONPATH="."; python -m uvicorn app.main:app --port 8000`
2. Launch frontend: `npm run dev` in `frontend/`
3. Open browser in an incognito window and navigate to `http://localhost:5173/login`.
4. Click **"Sign in with Google"**.
5. Complete Google account consent.
6. **Pass Criteria:**
   - Redirects to `/auth/callback`.
   - Displays "Municipal Identity Verification" loader.
   - Redirects cleanly to `/dashboard` within 1 second.
   - Top navigation displays user's Google display name and `CITIZEN` badge.
   - Refreshing `/dashboard` preserves the authenticated session.
7. **Failure Criteria:** Infinite loading spinner, error alert "No valid authentication session token", or immediate redirect back to `/login`.

### Manual Test 2: Database Recovery Drill (When Staging DB is Available)
1. Provision an isolated PostgreSQL database (e.g. `smart_city_recovery_test`).
2. Run Alembic migrations: `$env:DATABASE_URL="<recovery_db_url>"; alembic upgrade head`.
3. Execute `python scripts/migrate_sqlite_to_pg.py` pointing to `backend/backups/smart_city_backup_20261010_194437.db`.
4. **Pass Criteria:** All 26 records successfully insert with 0 integrity errors.
5. **Failure Criteria:** Missing foreign key errors or mismatched reference number hashes.

---

## I. Audit Conclusion

The application is **in a healthy, functional state for local engineering and restricted staging demonstrations**. The underlying architecture exhibits strong role segregation, secure cloud storage isolation, and strict state machine invariants. Public production release must remain on **NO-GO** status until target hosting infrastructure, production CORS/cookie settings, and legal claim alignments are formally completed.
