# Smart City Civic Issue & Complaint Management System
## Production-Grade Full-Stack Platform with Real PyTorch AI Classification

[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.12%20%7C%203.13-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![PyTorch](https://img.shields.io/badge/PyTorch-EfficientNetV2--S-EE4C2C.svg)](https://pytorch.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC.svg)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-16%20Passed%20(100%25)-brightgreen.svg)]()

A modern, production-engineered Smart City Civic Issue & Complaint Management System designed to empower citizens to report civic grievances (potholes, water leaks, streetlight failures, garbage accumulation, damaged roads) with real-time PyTorch computer-vision classification, deterministic municipal department routing, robust Role-Based Access Control (RBAC), private object storage, and an accessible, responsive civic SaaS user experience.

---

## Architecture Overview

The system is constructed as a high-performance modular monolith adhering to clean domain-driven architecture and OWASP Top 10 security standards:

```mermaid
flowchart TD
    subgraph Client["Frontend Client (React 19 + TypeScript + Vite)"]
        UI_Public["Public Portal\n(Landing, PIN-Based Tracking)"]
        UI_Citizen["Citizen Dashboard\n(Geo-Location, Image Capture)"]
        UI_Officer["Department Workspace\n(Kanban, Status Machine)"]
        UI_Admin["Admin Console\n(Analytics, AI Review Queue)"]
        Store["Zustand Auth Store"]
    end

    subgraph Gateway["API Layer (FastAPI 0.115+)"]
        CORS["Strict CORS & Security Headers"]
        RateLimit["Sliding-Window Rate Limiters"]
        AuthMid["JWT Auth Guard & RBAC (Citizen / Officer / Admin)"]
    end

    subgraph CoreEngine["Backend Services & Domain Engine"]
        ComplaintSvc["Complaint Service\n(Strict State Machine: SUBMITTED -> CLOSED)"]
        StorageSvc["Storage Service\n(Pillow Magic-Byte & Dimension Verification)"]
        AuditSvc["Immutable Audit Logger"]
        NotifSvc["Notification Dispatcher"]
    end

    subgraph MLEngine["PyTorch Machine Learning Engine"]
        ModelSingleton["EfficientNetV2-S Singleton Loader"]
        Preprocess["ImageNet Transform (224x224 RGB, Standard Norm)"]
        Inference["Torch Inference (CPU non-blocking asyncio.to_thread)"]
        Router["Deterministic Category -> Department Resolver"]
    end

    subgraph Persistence["Storage & Persistence"]
        DB[(PostgreSQL asyncpg / SQLite aiosqlite)]
        ObjStore[(Supabase Storage / Local Fallback Disk)]
    end

    UI_Public -->|REST / JSON| Gateway
    UI_Citizen -->|REST / Multipart Form| Gateway
    UI_Officer -->|REST / JSON| Gateway
    UI_Admin -->|REST / JSON| Gateway

    Gateway --> AuthMid
    AuthMid --> ComplaintSvc
    ComplaintSvc --> StorageSvc
    ComplaintSvc --> MLEngine
    ComplaintSvc --> AuditSvc
    ComplaintSvc --> NotifSvc
    ComplaintSvc --> DB
    StorageSvc --> ObjStore
    MLEngine --> Router
```

---

## Key Features

1. **Real Deep Learning Vision Inference:**
   - Powered by a real trained **EfficientNetV2-S** backbone with custom classification head.
   - 99.45% evaluation accuracy on held-out civic test datasets.
   - Non-blocking execution via `asyncio.to_thread` preventing event-loop lag.
   - **Fail-Open Resilience**: If image analysis encounters low confidence (< 0.80) or unparseable input, complaints are safely registered and queued for human review rather than lost.

2. **Deterministic Department Routing:**
   - Automatically maps validated civic categories to the municipal authority:
     - `damaged_road` & `pothole` &rarr; **Road Authority (ROAD)**
     - `garbage` &rarr; **Sanitation Department (SANI)**
     - `streetlight_failure` &rarr; **Infrastructure Department (INFR)**
     - `water_leak` &rarr; **Water Department (WATR)**

3. **Secure Multi-Role Access Control (RBAC):**
   - **Citizen**: Submit complaints with photo + geolocation, track owned tickets, view detailed timeline, reopen resolved issues.
   - **Department Officer**: Isolated to department-scoped complaints, assign tickets, record internal/public investigation notes, upload resolution evidence photos, advance lifecycle states.
   - **Administrator**: Comprehensive municipal analytics, manage departments, provision officer accounts, review AI low-confidence queue, override classifications with audit logging.

4. **Public Tracking with Verification PIN:**
   - Anyone with a Reference Number (`REF-YYYYMMDD-XXXXXX`) and 6-digit Tracking PIN can track resolution progress without account creation.
   - **Zero PII Exposure**: Public tracking strictly redacts complainant names, email addresses, exact coordinates, and internal officer notes.

5. **Security Hardening:**
   - Password hashing with **bcrypt (12 rounds)**.
   - Cryptographic tracking PIN verification.
   - Comprehensive file upload verification: Pillow magic-byte sniffing, format whitelisting (`image/jpeg`, `image/png`, `image/webp`), dimension constraints (32x32 to 8192x8192 px), and path traversal prevention.
   - Sliding-window rate limiters on authentication endpoints, file uploads, and tracking queries.
   - Cross-citizen ownership enforcement (prevents IDOR/BOLA attacks).

---

## Model Specifications & Preprocessing

The classification engine loads the audited checkpoint from `backend/app/ml/weights/best_model.pt`:

| Parameter | Value |
| :--- | :--- |
| **Backbone Architecture** | `torchvision.models.efficientnet_v2_s` |
| **Classifier Head** | `nn.Dropout(p=0.2, inplace=True)` &rarr; `nn.Linear(1280, 5)` |
| **Input Shape** | 3 &times; 224 &times; 224 (RGB) |
| **Normalization Mean** | `[0.485, 0.456, 0.406]` (ImageNet) |
| **Normalization Std** | `[0.229, 0.224, 0.225]` (ImageNet) |
| **Confidence Threshold** | `0.80` (values below 0.80 trigger human review) |

### Class Index Mapping:
- `0`: `damaged_road`
- `1`: `garbage`
- `2`: `pothole`
- `3`: `streetlight_failure`
- `4`: `water_leak`

---

## Directory Structure

```
Smart_City_Complaint_Management/
├── backend/
│   ├── alembic/                      # Database migrations
│   │   ├── versions/                 # Versioned migration scripts
│   │   └── env.py                    # Alembic async environment config
│   ├── app/
│   │   ├── api/v1/                   # FastAPI API routes
│   │   │   ├── admin.py              # Analytics, officer creation, AI overrides
│   │   │   ├── auth.py               # Register, login, profile management
│   │   │   ├── complaints.py         # Submission, tracking, IDOR-safe details
│   │   │   ├── department.py         # Officer workspace & status updates
│   │   │   ├── files.py              # Authenticated streaming file access
│   │   │   └── notifications.py      # In-app notifications
│   │   ├── core/                     # Security, RBAC guards, rate limiters
│   │   ├── db/                       # Engine, session, models, and seed script
│   │   ├── ml/                       # EfficientNetV2 model loader, routing, inference
│   │   │   └── weights/              # Extracted PyTorch checkpoint & metadata
│   │   ├── models/                   # SQLAlchemy ORM models (enums, user, complaint, etc.)
│   │   ├── schemas/                  # Pydantic validation & response DTOs
│   │   ├── services/                 # Complaint state machine & Storage service
│   │   ├── config.py                 # Pydantic Settings configuration
│   │   └── main.py                   # FastAPI application factory
│   ├── tests/                        # Comprehensive Pytest test suite (16 tests)
│   ├── alembic.ini                   # Alembic configuration
│   └── requirements.txt              # Backend dependencies
├── frontend/
│   ├── src/
│   │   ├── api/client.ts             # Axios API client with interceptors
│   │   ├── components/               # Nav, Footer, StatusBadge, Timeline, ProtectedRoute
│   │   ├── pages/
│   │   │   ├── admin/                # Admin Dashboard & AI Review Queue
│   │   │   ├── citizen/              # Citizen Dashboard, New Complaint, Detail View
│   │   │   ├── officer/              # Department Workspace & Status Update Modal
│   │   │   └── public/               # Landing Page, Public Tracking, Login, Register
│   │   ├── store/authStore.ts        # Zustand authentication state store
│   │   ├── types/index.ts            # TypeScript interfaces and contracts
│   │   ├── App.tsx                   # React Router route registry
│   │   └── main.tsx                  # React entry point
│   ├── tailwind.config.js            # Design tokens & responsive theme
│   ├── package.json                  # Frontend dependencies (React 19, Lucide, Tailwind)
│   └── vite.config.ts                # Vite build configuration & API proxy
├── TP100_FULL_WORKING_BACKUP.zip     # Preserved original backup archive (read-only)
├── TP100_Deployment_and_Report.zip   # Preserved evaluation archive (read-only)
└── README.md                         # This documentation
```

---

## Getting Started (Local Development)

### Prerequisites
- Python 3.11, 3.12, or 3.13
- Node.js 18+ and npm
- Windows PowerShell or Unix Terminal

---

### Step 1: Backend Setup

1. Open PowerShell and navigate to the `backend` directory:
   ```powershell
   cd C:\ARMIET\Smart_City_Complaint_Management\backend
   ```

2. (Optional) Activate your Python virtual environment if you use one:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

3. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```

4. Apply database migrations:
   ```powershell
   python -m alembic upgrade head
   ```

5. Seed initial departments, administrator, officers, and demo citizen:
   ```powershell
   python -m app.db.seed
   ```

6. Start the FastAPI development server:
   ```powershell
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   The backend API will be available at: `http://127.0.0.1:8000`
   Interactive Swagger documentation: `http://127.0.0.1:8000/docs`

---

### Step 2: Frontend Setup

1. Open a new PowerShell terminal and navigate to the `frontend` directory:
   ```powershell
   cd C:\ARMIET\Smart_City_Complaint_Management\frontend
   ```

2. Install dependencies:
   ```powershell
   npm install
   ```

3. Start the Vite development server:
   ```powershell
   npm run dev
   ```
   The frontend will launch at: `http://localhost:5173`

4. (Optional) Build for production:
   ```powershell
   npm run build
   ```

---

## Seed Accounts for Testing

The seed script (`python -m app.db.seed`) provisions the following default credentials for evaluation:

| Role | Email | Password | Department / Notes |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@smartcity.gov` | `AdminSecure2026!` | Full administrative access |
| **Road Authority Officer** | `officer.road@smartcity.gov` | `OfficerSecure2026!` | Road Authority (ROAD) |
| **Sanitation Officer** | `officer.sanitation@smartcity.gov` | `OfficerSecure2026!` | Sanitation Department (SANI) |
| **Infrastructure Officer** | `officer.infrastructure@smartcity.gov` | `OfficerSecure2026!` | Infrastructure Department (INFR) |
| **Water Authority Officer**| `officer.water@smartcity.gov` | `OfficerSecure2026!` | Water Department (WATR) |
| **Demo Citizen** | `citizen@smartcity.gov` | `CitizenSecure2026!` | Registered citizen account |

---

## Verification & Automated Test Suite

A complete test suite is provided in `backend/tests/` covering:
- Machine Learning inference and exact class-to-department routing (`test_ml_inference.py`)
- Corrupt image error handling and failover resilience
- Citizen registration, password validation, and privilege escalation prevention (`test_auth.py`)
- Complaint registration, tracking PIN generation, and PII protection (`test_complaints.py`)
- Department officer isolation & status transition matrix enforcement (`test_department_isolation.py`)
- Cross-citizen IDOR/BOLA security checks (`test_security_and_admin.py`)
- Admin analytics and officer provisioning

To run the complete automated test suite:
```powershell
cd C:\ARMIET\Smart_City_Complaint_Management\backend
python -m pytest -v
```

**Test Results:**
```
============================= 16 passed in 29.8s =============================
```

---

## Production Deployment & Cloud Storage (Supabase)

To deploy with Supabase PostgreSQL and Supabase Object Storage:

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Create a private bucket named `complaint-attachments`.
3. In `backend/.env`, configure:
   ```env
   DATABASE_URL=postgresql+asyncpg://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
   SUPABASE_KEY=[YOUR-SERVICE-ROLE-KEY]
   SUPABASE_BUCKET=complaint-attachments
   STORAGE_BACKEND=supabase
   SECRET_KEY=[YOUR-GENERATED-64-CHAR-HEX-KEY]
   ENVIRONMENT=production
   ```
4. Run migrations on the Supabase database:
   ```powershell
   python -m alembic upgrade head
   python -m app.db.seed
   ```

---

## License & Compliance
Built in accordance with municipal privacy guidelines and ISO/IEC 27001 data protection principles. All trained weights and evaluation artifacts in the backup archives have been preserved intact without modification.
