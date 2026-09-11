# Enterprise Multi-Tenant HRMS

A full-stack, multi-tenant **Human Resource Management System** built as a SaaS platform: a single **Super Admin** provisions and oversees many isolated **companies**, and each company gets a complete, self-service HR suite — employees, attendance, payroll, leave, recruitment, performance, finance, and more.

- **Backend:** Django + Django REST Framework
- **Frontend:** React 18 (Vite) + Redux Toolkit + React Query
- **Realtime:** Django Channels (WebSockets) for live notifications
- **Async jobs:** Celery + Celery Beat (Redis broker)
- **Data:** PostgreSQL, Redis (cache + channel layer)
- **Infra:** Docker Compose (Postgres, Redis, Django/Gunicorn, Celery worker, Celery beat, Vite dev server, Nginx)

---

## Table of Contents

- [Architecture](#architecture)
- [Multi-Tenancy Model](#multi-tenancy-model)
- [Roles & Permissions](#roles--permissions)
- [Feature Modules](#feature-modules)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running with Docker](#running-with-docker)
- [API Documentation](#api-documentation)
- [Background Jobs](#background-jobs)

---

## Architecture

```
┌──────────────┐      ┌──────────────┐      ┌───────────────────┐
│   Frontend    │◄────►│    Nginx      │◄────►│   Django / DRF     │
│ React + Vite  │      │ reverse proxy │      │  (Gunicorn, ASGI)  │
└──────────────┘      └──────────────┘      └─────────┬─────────┘
                                                        │
                                    ┌───────────────────┼───────────────────┐
                                    │                   │                   │
                              ┌─────▼─────┐      ┌──────▼──────┐     ┌──────▼──────┐
                              │ PostgreSQL │      │    Redis     │     │   Celery     │
                              │  (data)    │      │ cache/channel│     │ worker + beat│
                              └───────────┘      └─────────────┘     └─────────────┘
```

Every mutating API request also passes through an **audit-log middleware**, and every authenticated request is scoped to its tenant by a **tenant middleware** before it reaches a view.

## Multi-Tenancy Model

The platform uses **shared database, tenant-scoped rows** isolation:

1. **Login** issues a JWT whose payload carries `company_id`, `is_super_admin`, and the user's `roles` (`apps/authentication/serializers.py`).
2. **`TenantMiddleware`** (`apps/core/middleware.py`) decodes the JWT on every request, resolves the active `Company`, and stores it in a thread-local. Super Admins bypass this — no company is set, so they see all tenants.
3. **`TenantModel`** (`apps/core/models.py`) is the abstract base class for every HR record. Its `TenantManager` automatically filters every queryset by the current tenant, so application code rarely needs to filter by company explicitly. An `all_objects` manager is available as an escape hatch for cross-tenant operations (e.g. system notifications).

This means a bug in a single view can't leak another company's data — isolation is enforced at the ORM layer, not per-view.

## Roles & Permissions

Ten system roles ship out of the box:

| Role | Typical access |
|---|---|
| `super_admin` | Full platform control across all companies |
| `company_admin` | Full control within their company |
| `hr_admin` | People operations: employees, leave, recruitment, performance |
| `payroll_manager` | Payroll processing and payslips |
| `finance_manager` | Finance module, expense/budget oversight |
| `recruiter` | Recruitment pipeline |
| `manager` | Team oversight, approvals for direct reports |
| `team_lead` | First-line approvals within a team |
| `employee` | Self-service: attendance, leave, payslips, profile |
| `auditor` | Read-only access to logs, reports, analytics |

Permissions are modeled with `Role`, `Permission`, and `RolePermission` (`apps/rbac`), and enforced via composable DRF permission classes (`apps/core/permissions.py`) such as `IsSuperAdmin`, `IsCompanyAdmin`, `IsHRAdmin`, `IsPayrollManager`, `IsManager`, `IsRecruiter`, and `IsTeamLead` (an `IsSameTenant` object-permission class is also defined for per-object tenant checks, though it isn't currently wired into any view). Company Admins can seed standard permissions and customize role→permission mappings per company from the in-app RBAC manager (`apps/rbac/views.py`).

## Feature Modules

### Platform administration (Super Admin)
- **Company management** — onboard, suspend, or deactivate tenant companies
- **Auto-setup on company creation** (`apps/companies/auto_setup.py`) — provisions a brand-new company end-to-end in one transaction: 8 default departments, designations, teams, all system roles + permissions, 6 leave types with balances, a demo reporting hierarchy, and 4 ready-to-use demo logins (company admin, HR, manager, employee)
- **Subscriptions & billing** — plans, MRR tracking, active subscription monitoring
- **Global oversight** — cross-company employees, attendance, leave, and payroll dashboards
- **Platform monitoring & security** — login logs, activity logs, system health
- **Platform-wide RBAC & user management**

### Company workspace (per tenant)

Fully implemented, with real models, DRF viewsets, and matching React pages:

- **Employees** — full profiles, departments, designations, teams, reporting hierarchy, bank details, documents, emergency contacts
- **Attendance** — check-in/out tracking, shift management, regularization requests
- **Leave management** — the most sophisticated module in the system:
  - Dynamic multi-level approval chains: Employee → Team Lead → Reporting Manager(s) → HR Admin
  - Policy-driven accrual engine (`apps/leaves/services.py`) supporting monthly, yearly, or manual credit schedules
  - Full leave transaction ledger (credits, debits, encashment, expiry, adjustments, carry-forward) for auditability
  - Idempotent nightly Celery job to run due leave credits across all companies
  - Configurable leave types (Earned, Casual, Sick, Floater, Maternity, Paternity), carry-forward limits, negative-balance rules, and document requirements
- **Payroll** — salary structures, per-employee salary assignment, payroll runs, payslip generation (via a Celery task)
- **Recruitment** — job postings, candidate pipeline, interview scheduling
- **Performance** — appraisal cycles, goals, performance reviews
- **Finance** — budgets (annual/quarterly/monthly, per department), expense categories, expense submission/approval with receipts and spend-vs-budget tracking
- **Analytics & Reports** — role-aware dashboards (per-role views for HR, Manager, Payroll Manager, Recruiter, Team Lead, Employee) built on aggregate queries, plus CSV/report export endpoints
- **Notifications** — real-time, in-app notifications delivered over WebSockets (Django Channels), plus company announcements
- **Audit logs** — every mutating request (POST/PUT/PATCH/DELETE) is automatically recorded with user, action, path, IP, and user agent; login history is tracked separately
- **Settings** — one page (`SettingsPage.jsx`) covering company profile & work hours, holidays, leave types, shifts, departments, and designations, backed by the `companies`, `leaves`, `attendance`, and `employees` APIs
- **Module toggles** — `Company.module_flags` lets a Super Admin enable/disable individual HRMS modules per company from the company detail page

### Scaffolded but not yet implemented

These apps exist end-to-end in the URL routing and are wired for module-flag toggling, but currently have **no real models, business logic, or frontend pages** — each backend app only has an empty model file (`# ... models — implement per module spec`) and a single endpoint that returns `{"detail": "Module coming soon."}`:

- **Assets** (`apps/assets`) — intended for company asset tracking/assignment
- **Tickets** (`apps/tickets`) — intended for an internal helpdesk
- **Training** (`apps/training`) — intended for training programs/enrollment
- **Compliance** (`apps/compliance`) — intended for statutory compliance tracking
- **Settings app** (`apps/settings_app`) — placeholder API app; the actual Settings *page* in the frontend is functional but talks to other apps' APIs (see above), not this one

Treat these as a starting point for future work, not as shipped features.

## Tech Stack

**Backend**
- Django 4.2 + Django REST Framework
- SimpleJWT (access/refresh tokens, rotation + blacklist)
- drf-spectacular (OpenAPI schema, Swagger & Redoc UI)
- django-filter (filtering/search/ordering on list endpoints)
- Django Channels + channels-redis (WebSocket notifications)
- Celery + django-celery-beat + django-celery-results (background & scheduled jobs)
- PostgreSQL (psycopg2), Redis (cache, channel layer, Celery broker)
- WhiteNoise (static files), Gunicorn/Daphne (serving)
- Pillow, openpyxl, reportlab (media & export), boto3/django-storages (optional S3), Twilio (optional SMS/OTP)

**Frontend**
- React 18 + Vite
- Redux Toolkit (auth/session/UI state) + TanStack React Query (server state)
- React Router 6 (route guards for Super Admin / tenant / role-specific routes)
- Tailwind CSS, Headless UI, Framer Motion, Lucide icons
- React Hook Form + Zod (form validation)
- Axios (JWT attach + automatic refresh-on-401 interceptor)
- Recharts (dashboards/analytics)

**Infrastructure**
- Docker Compose: `postgres`, `redis`, `backend` (Gunicorn), `celery_worker`, `celery_beat`, `frontend` (Vite dev server), `nginx`
- Health checks and dependency ordering wired between services

## Project Structure

```
hrms/
├── backend/
│   ├── apps/
│   │   ├── core/            # TenantModel/TenantManager, middleware, permissions, pagination
│   │   ├── companies/       # Tenant companies, settings, holidays, auto-setup service
│   │   ├── subscriptions/   # Plans & subscriptions (billing)
│   │   ├── authentication/  # Custom User model, JWT, OTP, MFA
│   │   ├── rbac/            # Roles, permissions, role-permission & user-role mappings
│   │   ├── employees/       # Employees, departments, designations, teams
│   │   ├── attendance/      # Attendance tracking
│   │   ├── payroll/         # Payroll runs & payslips
│   │   ├── leaves/          # Leave types, policies, requests, approvals, accrual engine
│   │   ├── recruitment/     # Job postings & candidates
│   │   ├── performance/     # Performance reviews
│   │   ├── finance/         # Company finance records
│   │   ├── assets/          # Asset tracking
│   │   ├── tickets/         # Support tickets
│   │   ├── training/        # Training programs
│   │   ├── compliance/      # Compliance tracking
│   │   ├── dashboards/      # Role-specific aggregate dashboard views
│   │   ├── analytics/       # Analytics endpoints
│   │   ├── reports/         # Report generation/export
│   │   ├── notifications/   # WebSocket consumer + notification model
│   │   ├── audit_logs/      # Activity & login audit trail
│   │   └── settings_app/    # Company-level settings
│   ├── config/               # Django settings, URLs, ASGI/WSGI, Celery app
│   └── manage.py
├── frontend/
│   └── src/
│       ├── super-admin/      # Platform-level pages (companies, billing, monitoring, RBAC…)
│       ├── company-admin/    # Company onboarding/setup
│       ├── dashboards/       # Per-role dashboards
│       ├── employees/ attendance/ leaves/ payroll/ recruitment/
│       │   performance/ finance/ analytics/ reports/ audit-logs/
│       │   notifications/ settings/ rbac/ teams/   # Feature pages
│       ├── layouts/          # AuthLayout, MainLayout, SuperAdminLayout
│       ├── routes/           # Route guards & route table
│       ├── redux/            # Store & slices (auth, notifications, RBAC, UI)
│       ├── services/         # Axios client, auth service
│       └── hooks/            # useAuth, usePermission, useWebSocket
├── nginx/                     # Reverse proxy config
├── scripts/setup.sh           # Local (non-Docker) dev bootstrap
└── docker-compose.yml
```

## Getting Started

### Option 1 — Docker (recommended)

```bash
cp .env.example .env    # edit values as needed
docker compose up --build
```

This starts Postgres, Redis, the Django backend (auto-runs migrations + `collectstatic`), Celery worker & beat, the Vite dev server, and Nginx.

- Frontend: http://localhost:5173 (or via Nginx on http://localhost)
- API: http://localhost:8000/api/v1/
- API docs: http://localhost:8000/api/v1/docs/

### Option 2 — Local script

```bash
./scripts/setup.sh
```

Creates `.env`, sets up a Python virtualenv, installs backend dependencies, runs migrations, and creates a default Super Admin (`admin@hrms.com` / `admin123` — **change this in any real deployment**). You'll still need to run the frontend separately:

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

See [.env.example](.env.example) for the full list. Key groups:

- **PostgreSQL** — `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL`
- **Django** — `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `DJANGO_SETTINGS_MODULE`
- **Redis** — `REDIS_URL` (cache, Celery broker, Channels layer)
- **JWT** — `JWT_ACCESS_TOKEN_LIFETIME_MINUTES`, `JWT_REFRESH_TOKEN_LIFETIME_DAYS`
- **Email** — SMTP settings for password reset / notifications (console backend by default)
- **Optional integrations** — AWS S3 (media storage), Twilio (SMS/OTP)
- **Frontend** — `VITE_API_BASE_URL`, `VITE_WS_BASE_URL`

> ⚠️ A `.env` is present in this repo for local development convenience. Rotate `SECRET_KEY`, database credentials, and any real third-party keys before deploying, and do not commit real secrets.

## Running with Docker

Useful commands once the stack is up:

```bash
# Django management commands
docker compose exec backend python manage.py <command>

# Create an additional superuser
docker compose exec backend python manage.py createsuperuser

# Tail logs for a service
docker compose logs -f backend

# Celery worker / beat logs
docker compose logs -f celery_worker celery_beat
```

## API Documentation

Once the backend is running, interactive API docs are available at:

- Swagger UI: `/api/v1/docs/`
- Redoc: `/api/v1/redoc/`
- Raw OpenAPI schema: `/api/v1/schema/`
- Health check: `/api/v1/health/`

## Background Jobs

Celery Beat runs scheduled jobs via the database scheduler (`django-celery-beat`). Currently configured:

| Task | Schedule | Purpose |
|---|---|---|
| `leaves.run_due_leave_credits` | Daily at 00:05 UTC | Applies due monthly/yearly leave accruals across all companies, logged per policy/period for idempotency |

---

**Note:** This README describes the system as implemented in this repository. There is currently no automated test suite or CI pipeline configured — contributions adding test coverage are welcome.
