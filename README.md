# TrustFund

> **Trusted giving, real impact.** A transparent fundraising and donation platform that connects donors, verified charities, and volunteers.

TrustFund is a full-stack donation platform that makes online giving trustworthy. Donors discover verified charities and active campaigns, give securely through a regulated payment gateway, and follow their money all the way to impact. Charities manage their organization, fundraising campaigns, updates, and volunteer opportunities in one place. Volunteers find and join real‑world opportunities. Every payment, receipt, campaign update, and verification decision is tracked end‑to‑end.

---

## The problem it solves

Online giving carries a persistent trust gap:

- **Donors** cannot easily tell which organizations are legitimate or where their money goes.
- **Charities** have no ready‑made tooling for campaigns, donor communication, receipts, or volunteer coordination.
- **Volunteers** have no central place to discover opportunities posted by genuine organizations.
- **Everyone** lacks visible, verifiable proof of impact — receipts, updates, and transparent financial totals.

## Project vision

**Every rupee tracked from donation to impact.**

- Charities can only raise funds after passing a **documented verification workflow**, not by self‑declaration.
- Every campaign shows its goal, how much has been raised, and how much remains — always. `raised_amount` is controlled exclusively by the donations domain and can never be edited through campaign endpoints.
- Every successful donation produces a **numbered PDF receipt** and atomically increases the campaign's raised total.
- Donors, charities, volunteers, and admins each get a **dedicated, role‑gated workspace** tailored to what they do.

---

## Key features

- **Authentication** — email + password login with JWT access/refresh tokens, refresh‑token rotation, and blacklisting.
- **Role‑based access control** — four roles with dedicated experiences: **DONOR**, **CHARITY**, **VOLUNTEER**, **ADMIN**.
- **Charity verification** — organization profiles with a `PENDING → VERIFIED → REJECTED` workflow, submission/review/resubmission endpoints, and a full audit log of every verification action.
- **Campaign management** — campaigns with a validated lifecycle (`DRAFT → ACTIVE → COMPLETED / EXPIRED / CANCELLED`), ten categories, goals, locations, and optional cover images. Only verified charity owners can create and manage their campaigns.
- **Campaign updates** — charities post progress updates; donors are notified.
- **Payments** — Razorpay integration with server‑side order creation, checkout, signature verification, and webhook handling with idempotent, atomic settlement.
- **Receipts** — automatic numbered PDF donation receipts (ReportLab) with unique `TRF-YYYYMMDD-XXXXXX` identifiers.
- **Volunteers** — charities publish opportunities; volunteers apply with a statement; both sides track statuses through a clear workflow.
- **Notifications** — typed in‑app notifications (donation, milestone, update, volunteer, receipt) with duplicate protection.
- **Dashboards & analytics** — donor, charity, and admin dashboards plus a public analytics endpoint (donations by category, campaign success rates).
- **Admin console** — admin users view and manage charity verifications via a dedicated admin UI with audit history.

---

## Roles

| Role | What they can do |
|---|---|
| **DONOR** | Browse campaigns, donate through Razorpay, view donation history and details, download PDF receipts, follow notifications, and track their total impact in the donor dashboard. |
| **CHARITY** | Register and manage their organization, submit it for verification, create and manage campaigns and updates, post volunteer opportunities, and review applications in the charity dashboard. |
| **VOLUNTEER** | Discover open volunteer opportunities, apply with a statement, and track application and attendance status. |
| **ADMIN** | Review and approve/reject charity verifications (with audit trail), view system‑wide metrics (users, charities, campaigns, funds raised), and manage charities through the admin console UI. |

---

## Architecture

TrustFund is a two‑tier web application: a **Django REST Framework** API backend and a **React + TypeScript + Vite** single‑page frontend served over HTTPS.

```
┌──────────────────────────┐        HTTPS / JSON         ┌──────────────────────────────┐
│        Frontend          │ ◀─────────────────────────▶ │           Backend            │
│  React 19 · Vite · TS    │        /api/v1/...          │   Django 6 · DRF 3.15        │
│  Role-gated routes       │                            │   JWT auth (SimpleJWT)        │
└──────────────────────────┘                            │   Per-domain Django apps      │
    Static + SPA (Render)                                └──────────────┬───────────────┘
                                                          PostgreSQL (DATABASE_URL)
                                                          Redis + Celery (async jobs)
                                                          Razorpay (payments, webhook)
                                                          Cloudinary (production media)
```

### Backend structure

```
backend/
├── config/           # settings, URL routing, health check, Celery/WSGI entrypoints
├── users/            # custom User model, roles, JWT auth, permissions
├── charities/        # organizations + verification workflow
├── campaigns/        # campaigns, categories, lifecycle, updates
├── donations/        # donations, Razorpay orders/webhooks, payment services
├── receipts/         # numbered receipts + PDF generation
├── volunteers/       # opportunities + applications
├── notifications/    # in-app notifications + Celery tasks
├── admin_api/        # admin-facing endpoints (users, charities, audit logs)
└── dashboard/        # donor / charity / admin dashboards + analytics
```

### Frontend structure

```
frontend/src/
├── app/          # config (brand, nav), central route table
├── components/   # design-system primitives (button, dialog, form, toast, …)
├── layouts/      # site shell, auth layout, app shell
├── pages/        # home, auth, campaigns, donor, charity, volunteer, admin, public
├── services/     # typed API clients (auth, campaigns, donations, receipts, admin, …)
├── context/      # auth context
├── hooks/        # reusable UI hooks
└── styles/       # design tokens + base/utilities
```

---

## Technology stack

| Layer | Technology |
|---|---|
| Backend | Python 3 · Django 6 · DRF 3.15 · django‑environ · django‑filter · django‑cors‑headers |
| Auth | django‑rest‑framework‑simplejwt (access/refresh tokens with rotation + blacklist) |
| Database | PostgreSQL via `DATABASE_URL` (SQLite works out of the box for local dev) |
| Async | Celery 5 · Redis (broker + result backend) |
| Payments | Razorpay Python SDK 1.4 |
| Receipts | ReportLab (PDF generation) |
| Static files | WhiteNoise (production static serving via gunicorn) |
| Media (prod) | Cloudinary via django‑cloudinary‑storage (optional; disabled by default) |
| Frontend | React 19 · TypeScript 5.7 · Vite 6 · React Router 7 · Motion (animation) |
| Testing | pytest + pytest‑django (backend) · Vitest + Testing Library (frontend) |
| Production | gunicorn · WhiteNoise · Cloudinary · environment‑driven settings |

---

## Security & RBAC

- **Custom user model** with email as login identifier and a mandatory `role` field (`DONOR | CHARITY | VOLUNTEER | ADMIN`).
- **Deny‑by‑default**: DRF default permission is `IsAuthenticated`; public read endpoints opt in explicitly.
- **Object‑level authorization**: charities can only manage their own organization and campaigns; verification approve/reject is restricted to admins; a charity cannot verify itself.
- **Password hashing**: Django's password hashers handle all credentials — nothing stored in plaintext.
- **Secrets by environment only**: `SECRET_KEY`, `DATABASE_URL`, Razorpay credentials, Cloudinary credentials, and Celery settings are read from environment variables at runtime. Defaults in `settings.py` are non‑functional placeholders.
- **JWT hardening**: rotating refresh tokens with blacklisting; `SIGNING_KEY` tied to `SECRET_KEY`.
- **Payment integrity**: server‑side signature verification for both checkout callbacks and webhooks; idempotency keys prevent duplicate charges; `raised_amount` is updated atomically (`F()`) inside a transaction with `select_for_update` for concurrency safety.
- **Secure cookies in production**: `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SECURE_SSL_REDIRECT`, and `SECURE_PROXY_SSL_HEADER` are all enabled behind the Render TLS proxy when `DEBUG=False`.

---

## Donation & payment architecture

1. Donor opens a campaign and chooses an amount → frontend calls the donations API.
2. Backend validates the campaign is **ACTIVE**, creates a **Razorpay order**, and stores a `PENDING` donation with a unique `idempotency_key`.
3. Frontend launches **Razorpay Checkout** (SDK loaded asynchronously; `VITE_RAZORPAY_KEY_ID` provides the public key).
4. On success the client sends `payment_id` + `signature`; backend **verifies the signature** and, on success, marks the donation `SUCCESS` and **atomically increments** the campaign's raised amount.
5. **Webhooks** (`payment.captured` / `order.paid`) are signature‑verified and processed idempotently — a webhook arriving after a completed checkout simply no‑ops.
6. A receipt is generated for the successful donation and the donor is notified.

Every money‑movement path is guarded by signature verification and idempotency so retries, duplicate webhooks, and replays cannot double‑count.

---

## Campaign management

- Campaigns must belong to a **verified** charity organization.
- Lifecycle is enforced with validated transitions: `DRAFT → ACTIVE` (or `CANCELLED`); `ACTIVE → COMPLETED / EXPIRED / CANCELLED`; terminal states are final.
- `goal_amount` must be positive (DB check constraint) and `raised_amount` is **never writable through campaign APIs** — it is owned by the donations domain.
- Verified charities' new campaigns start as `ACTIVE` by default; unverified charities' campaigns start as `DRAFT`.

---

## Organization verification

1. A charity owner creates an organization profile and **submits** it for verification.
2. An admin reviews it via the dedicated endpoints and **approves** or **rejects** it (with a required reason on rejection).
3. A rejected organization can fix issues and **resubmit**.
4. Every action is recorded in a `verification_logs` audit trail.

Only verified organizations can appear in the public campaign discovery feed and raise funds.

---

## Volunteer workflow

- **Charities** publish volunteer opportunities (title, description, location, event date, slots, optional linked campaign).
- **Volunteers** browse open opportunities and apply with a statement.
- Applications move through `PENDING → APPROVED / REJECTED / ATTENDED`; a volunteer can apply to each opportunity only once.
- Both sides receive notifications on status changes.

---

## Transparency & impact tracking

- Every **successful donation** is reflected immediately and atomically in the campaign's raised total.
- **Numbered receipts** give donors an auditable record of each contribution.
- **Campaign updates** give an ongoing narrative of how funds are used.
- Public **analytics** endpoint reports donations by category and campaign success rates.
- The **charity dashboard** shows funds raised across an organization's campaigns; the **donor dashboard** shows lifetime giving.

---

## Testing & quality

**Backend** — pytest + pytest‑django suites covering:

- Authentication (register/login/refresh/logout/me), models, and JWT integration
- Charity verification workflow (submit/approve/reject/resubmit, permissions, audit history)
- Campaigns (lifecycle transitions, ownership rules, image handling, updates & notifications)
- Donations (payment initiation, signature verification, webhook idempotency)
- Dashboards and analytics
- Receipts API and PDF generation
- Volunteers (opportunities, applications, authorization)
- Settings / config (Cloudinary disabled in dev, health check)

**Frontend** — Vitest + React Testing Library covering components, hooks, auth context, services, formatters, and every role‑gated page, plus ESLint and strict `tsc` typechecking enforced in the build.

```bash
# Backend
cd backend && pytest          # uses .venv/Scripts/python internally

# Frontend
cd frontend && npm test       # runs vitest
```

---

## Current status

| Module | Status |
|---|---|
| Donor Experience | ✅ Complete |
| Charity Experience | ✅ Complete |
| Volunteer Experience | ✅ Complete |
| Admin Experience | ✅ Complete |
| Organization Verification | ✅ Complete (admin audit trail included) |
| Campaign Management | ✅ Complete |
| Donation / Payment Flow | ✅ Complete (Razorpay test credentials required) |
| ML / Intelligence Layer | 🔜 Planned |

All core product features are implemented and tested. The platform is ready for deployment to Render with Neon PostgreSQL and Cloudinary media storage (see [Deployment](#deployment) below).

---

## Roadmap

- **Verified Impact Reporting** — per‑campaign impact stories, milestone reports, and public transparency pages.
- **Donation Experience** — recurring donations, one‑tap repeat giving, and India/U.K. tax‑receipt formatting.
- **ML / Intelligence Layer** — donation‑trend analytics, smart campaign recommendations, anomaly detection, and fraud signals. *Planned; not yet implemented.*
- **Search & Filters** — richer campaign discovery (location, category, impact tags).

---

## Local development setup

### Prerequisites

- Python 3.12+ and pip
- Node.js 18+ and npm
- (Optional) PostgreSQL and Redis — not required for getting started; SQLite and in‑memory Celery work out of the box.

### Backend

```bash
cd backend

# 1. Create and activate a virtual environment
python -m venv .venv
# Windows (PowerShell):  .venv\Scripts\Activate.ps1
# macOS / Linux:         source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
#    Windows:  copy .env.example .env
#    macOS/Linux: cp .env.example .env
#    Defaults (SQLite, eager Celery, no Cloudinary) work without editing.

# 4. Create the database schema
python manage.py migrate

# 5. (Optional) Seed verified charities and ACTIVE campaigns
python manage.py seed_dev_data

# 6. Start the API
python manage.py runserver
```

The API is available at `http://localhost:8000/api/v1/`. A health check is served at `GET /healthz/` (returns `{"status": "ok"}`).

### Frontend

```bash
cd frontend
npm install

# (Optional) copy the frontend env example
#   Windows:  copy .env.example .env
#   macOS/Linux: cp .env.example .env
#   Defaults work without editing (API at localhost:8000).

npm run dev
```

The app runs at `http://localhost:3000` and calls the API directly at `http://localhost:8000`.

---

## Environment configuration

All secrets are **environment variables** — never committed. The repository includes safe `.env.example` files with placeholders; copy them to `.env` and fill in real values locally. The `.env` files themselves are git‑ignored.

### Backend — `backend/.env.example`

| Variable | Required | Purpose | Dev default |
|---|---|---|---|
| `DEBUG` | Yes | Django debug mode | `True` |
| `SECRET_KEY` | Yes | Django signing key — generate a strong random value for production | placeholder |
| `ALLOWED_HOSTS` | Yes | Comma‑separated allowed hostnames | `localhost,127.0.0.1` |
| `DATABASE_URL` | Yes | PostgreSQL connection string (Neon: append `?sslmode=require`) | `sqlite:///db.sqlite3` |
| `CONN_MAX_AGE` | No | Persistent DB connection lifetime in seconds (production Postgres) | `60` |
| `CONN_HEALTH_CHECKS` | No | Enable DB connection health checks (production Postgres) | `True` |
| `REDIS_URL` | Yes | Redis URL (Celery broker) | `redis://localhost:6379/0` |
| `CELERY_BROKER_URL` | Yes | Celery broker URL | `redis://localhost:6379/1` |
| `CELERY_RESULT_BACKEND` | Yes | Celery result backend URL | `redis://localhost:6379/2` |
| `CELERY_TASK_ALWAYS_EAGER` | No | Run Celery tasks synchronously in dev | `True` |
| `CELERY_TASK_EAGER_PROPAGATES_EXCEPTIONS` | No | Propagate exceptions from eager Celery tasks | `True` |
| `CORS_ALLOWED_ORIGINS` | Yes | Frontend origins to allow | `http://localhost:3000,...` |
| `CSRF_TRUSTED_ORIGINS` | Yes | Trusted CSRF origins (must match CORS) | `http://localhost:3000,...` |
| `EMAIL_URL` | Yes | Email backend (e.g. `console://` in dev, `smtps://` in prod) | `console://` |
| `RAZORPAY_KEY_ID` | Yes | Razorpay key ID (test key in development) | placeholder |
| `RAZORPAY_KEY_SECRET` | Yes | Razorpay key secret (test secret in development) | placeholder |
| `RAZORPAY_WEBHOOK_SECRET` | Yes | Razorpay webhook signing secret | placeholder |
| `CLOUDINARY_STORAGE_ENABLED` | No | Enable Cloudinary for production media storage | `False` |
| `CLOUDINARY_CLOUD_NAME` | No* | Cloudinary cloud name (*required if enabled) | empty |
| `CLOUDINARY_API_KEY` | No* | Cloudinary API key (*required if enabled) | empty |
| `CLOUDINARY_API_SECRET` | No* | Cloudinary API secret (*required if enabled) | empty |
| `SECURE_SSL_REDIRECT` | No | Redirect HTTP to HTTPS (set `True` in production) | `False` |
| `SESSION_COOKIE_SECURE` | No | Only send session cookies over HTTPS | `False` |
| `CSRF_COOKIE_SECURE` | No | Only send CSRF cookies over HTTPS | `False` |

**Secrets that must never be committed**: `SECRET_KEY`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `CLOUDINARY_API_SECRET`, database password (inside `DATABASE_URL`).

### Frontend — `frontend/.env.example`

| Variable | Purpose | Dev default |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL of the Django API | `http://localhost:8000` |
| `VITE_RAZORPAY_KEY_ID` | Razorpay **public** key ID used by checkout | `rzp_test_xxxxxx` |

`VITE_RAZORPAY_KEY_ID` is a **public** key and is safe to include in the Vite build output.

---

## Deployment

### Neon PostgreSQL

1. Create a Neon project and copy the connection string.
2. Append `?sslmode=require` to the URL.
3. Set `DATABASE_URL` in the Render backend environment to the full Neon string.

### Cloudinary (production media storage — optional)

Cloudinary is used for user‑uploaded campaign images in production. In development, files are stored on the local filesystem (the default).

1. Create a free Cloudinary account and note your **Cloud Name**, **API Key**, and **API Secret**.
2. In Render, set:
   - `CLOUDINARY_STORAGE_ENABLED=True`
   - `CLOUDINARY_CLOUD_NAME=<your cloud name>`
   - `CLOUDINARY_API_KEY=<your API key>`
   - `CLOUDINARY_API_SECRET=<your API secret>`
3. All three credentials are **secrets** — never commit real values to Git.
4. When disabled (default), the `cloudinary_storage` Django app is not loaded and the local filesystem is used for all media.

### Render — Backend

| Setting | Value |
|---|---|
| **Root Directory** | `backend` |
| **Build Command** | `./build.sh` |
| **Start Command** | `gunicorn config.wsgi:application` |
| **Runtime** | Python 3.12+ |

`build.sh` runs `pip install`, `collectstatic`, and `migrate` automatically.

**Required Render environment variables** (all are secrets except where noted):

| Variable | Type |
|---|---|
| `DEBUG` | Non‑secret (`False`) |
| `SECRET_KEY` | **Secret** |
| `ALLOWED_HOSTS` | Non‑secret (your `.onrender.com` hostname) |
| `DATABASE_URL` | **Secret** (Neon connection string) |
| `CONN_MAX_AGE` | Non‑secret (`60`) |
| `CONN_HEALTH_CHECKS` | Non‑secret (`True`) |
| `REDIS_URL` | **Secret** (Redis connection string) |
| `CELERY_BROKER_URL` | **Secret** |
| `CELERY_RESULT_BACKEND` | **Secret** |
| `CELERY_TASK_ALWAYS_EAGER` | Non‑secret (`True` — works without a separate worker initially) |
| `CELERY_TASK_EAGER_PROPAGATES_EXCEPTIONS` | Non‑secret (`True`) |
| `CORS_ALLOWED_ORIGINS` | Non‑secret (your frontend `.onrender.com` URL) |
| `CSRF_TRUSTED_ORIGINS` | Non‑secret (same as CORS) |
| `EMAIL_URL` | Depends on provider |
| `RAZORPAY_KEY_ID` | Non‑secret (test key for now) |
| `RAZORPAY_KEY_SECRET` | **Secret** |
| `RAZORPAY_WEBHOOK_SECRET` | **Secret** |
| `CLOUDINARY_STORAGE_ENABLED` | Non‑secret (`False` if not using Cloudinary) |
| `CLOUDINARY_CLOUD_NAME` | **Secret** (if using Cloudinary) |
| `CLOUDINARY_API_KEY` | **Secret** (if using Cloudinary) |
| `CLOUDINARY_API_SECRET` | **Secret** (if using Cloudinary) |
| `SECURE_SSL_REDIRECT` | Non‑secret (`True`) |
| `SESSION_COOKIE_SECURE` | Non‑secret (`True`) |
| `CSRF_COOKIE_SECURE` | Non‑secret (`True`) |

### Render — Frontend

| Setting | Value |
|---|---|
| **Root Directory** | `frontend` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |
| **SPA Rewrite** | Source `/*` → Destination `/index.html` · Action **Rewrite** (not Redirect) |

**Required Render environment variables** (non‑secret):

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | Your backend Render URL (e.g. `https://YOUR-TRUSTFUND-URL.onrender.com`) |
| `VITE_RAZORPAY_KEY_ID` | Your Razorpay test public key |

> **Important**: Vite inlines `VITE_*` variables at build time. You must set these environment variables **before** triggering the build. After changing them, trigger a manual deploy on Render.

### Your production URL

Once deployed, your frontend will be available at:

```
https://YOUR-TRUSTFUND-URL.onrender.com
```

Replace this with your actual Render frontend service URL.

---

## Security notes

- **Never commit real credentials.** Real API keys, `SECRET_KEY`s, database passwords, or payment secrets live only in environment variables or a local `.env` file that is git‑ignored.
- `.env` files are git‑ignored; only the placeholder `.env.example` files are tracked.
- For production: run gunicorn (never `runserver`), set `DEBUG=False`, use PostgreSQL + Redis, configure secure cookies/SSL, and generate a fresh `SECRET_KEY`.
- Use **Razorpay test keys** for development and only configure **live keys** in a protected production environment.
- Cloudinary credentials are secrets — never commit them, never include them in frontend builds.
- This project has not yet been penetration‑tested; treat it as a development‑stage codebase.

---

## License

Released under the [MIT License](LICENSE). © 2026 Abi Thomas.
