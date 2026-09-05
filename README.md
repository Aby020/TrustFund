# TrustFund

> **Trusted giving, real impact.** A transparent fundraising and donation platform that connects donors, verified charities, and volunteers.

TrustFund is a full-stack donation platform that makes online giving trustworthy. Donors discover verified charities and active campaigns, give securely through a regulated payment gateway, and follow their money all the way to the impact. Charities manage their organization, fundraising campaigns, updates, and volunteer opportunities in one place. Volunteers find and join real‑world opportunities. Every payment, receipt, campaign update, and verification decision is tracked end‑to‑end.

## The problem it solves

Online giving carries a persistent trust gap:

- **Donors** cannot easily tell which organizations are legitimate or where their money actually goes.
- **Charities** have no ready‑made tooling for campaigns, donor communication, receipts, or volunteer coordination.
- **Volunteers** have no central place to discover opportunities posted by genuine organizations.
- **Everyone** lacks visible, verifiable proof of impact — receipts, updates, and transparent financial totals.

## Project vision

**Every rupee tracked from donation to impact.**

TrustFund is built around a few uncompromising principles:

- Charities can only raise funds after passing a **documented verification workflow**, not by self‑declaration.
- Every campaign shows its goal, how much has been raised, and how much remains — always. The raised amount is controlled exclusively by the donations domain and can never be edited through campaign endpoints.
- Every successful donation produces a **numbered PDF receipt** and atomically increases the campaign's raised total.
- Donors, charities, and volunteers each get a **dedicated, role‑gated workspace** tailored to what they do.

## Key features

- **Authentication** — email + password login with JWT access/refresh tokens, refresh‑token rotation, and blacklisting.
- **Role‑based access control** — four roles with dedicated experiences: **DONOR**, **CHARITY**, **VOLUNTEER**, and **ADMIN**.
- **Charity verification** — organization profiles with a `PENDING → VERIFIED → REJECTED` workflow, submission/review/resubmission endpoints, and a full audit log of every verification action.
- **Campaign management** — campaigns with a validated lifecycle (`DRAFT → ACTIVE → COMPLETED / EXPIRED / CANCELLED`), ten categories, goals, locations, and optional cover images. Only verified charity owners can create and manage their campaigns.
- **Campaign updates** — charities post progress updates that drive donor notifications.
- **Payments** — Razorpay integration with server‑side order creation, checkout, signature verification, and **webhook handling with idempotent, atomic** settlement.
- **Receipts** — automatic numbered PDF donation receipts (ReportLab) with unique `TRF-YYYYMMDD-XXXXXX` numbers.
- **Volunteers** — charities publish opportunities; volunteers apply with a statement; both sides track statuses.
- **Notifications** — typed in‑app notifications (donation, milestone, update, volunteer, receipt) with duplicate protection, delivered via Celery tasks.
- **Dashboards & analytics** — donor, charity, and admin dashboards plus a public analytics endpoint (donations by category, campaign success rates).

## Roles

| Role      | What they can do |
| --------- | ---------------- |
| **DONOR** | Browse campaigns, donate through Razorpay, view donation history and details, download PDF receipts, follow notifications, and track their total impact in the donor dashboard. |
| **CHARITY** | Register and manage their organization, submit it for verification, create and run campaigns and updates, post volunteer opportunities, and review applications in the charity dashboard. |
| **VOLUNTEER** | Discover open volunteer opportunities, apply with a statement, and track application and attendance status. |
| **ADMIN** | Review and approve/reject charity verifications, view system‑wide metrics (users, charities, campaigns, funds raised). A dedicated admin console UI is planned. |

## Architecture

TrustFund is a classic two‑tier web application: a **Django REST Framework** API backend and a **React + TypeScript + Vite** single‑page frontend that talks to it over versioned JSON endpoints.

```
┌──────────────────────────┐        HTTPS / JSON         ┌──────────────────────────────┐
│        Frontend          │ ◀─────────────────────────▶ │           Backend            │
│  React 19 · Vite · TS    │        /api/v1/...          │   Django 6 · Django REST FW   │
│  Role-gated routes       │                            │   JWT auth (SimpleJWT)        │
└──────────────────────────┘                            │   Per-domain Django apps      │
                                                       └──────────────┬───────────────┘
                                                              PostgreSQL (DATABASE_URL)
                                                              Redis + Celery (async jobs)
                                                              Razorpay (payments, webhook)
```

The backend is organized as **one Django app per domain**, each with its own models, serializers, views, URLs, and tests:

```
backend/
├── config/           # project settings, URL routing, Celery/ASGI/WSGI entrypoints
├── users/            # custom User model, roles, JWT auth, permissions
├── charities/        # organizations + verification workflow
├── campaigns/        # campaigns, categories, lifecycle, updates
├── donations/        # donations, Razorpay orders/webhooks, payment services
├── receipts/         # numbered receipts + PDF generation
├── volunteers/       # opportunities + applications
├── notifications/    # in-app notifications + Celery tasks
└── dashboard/        # donor / charity / admin dashboards + analytics
```

The frontend is code‑split by route with a shared design‑token system:

```
frontend/src/
├── app/          # config (brand, nav) and central route table
├── components/   # design-system primitives (button, dialog, form, toast, …)
├── layouts/      # site shell, auth layout, app shell
├── pages/        # home, auth, campaigns, donor, charity, volunteer, dashboard
├── services/     # typed API clients (auth, campaigns, donations, receipts, …)
├── context/      # auth context
├── hooks/        # reusable UI hooks
└── styles/       # design tokens + base/utilities
```

## Technology stack

| Layer      | Technology |
| ---------- | ---------- |
| Backend    | Python 3 · Django 6 · Django REST Framework 3.15 · django‑environ · django‑filter · django‑cors‑headers |
| Auth       | django‑rest‑framework‑simplejwt (access/refresh tokens with rotation + blacklist) |
| Database   | PostgreSQL via `DATABASE_URL` (SQLite works out of the box for local development) |
| Async      | Celery 5 · Redis (broker + result backend) |
| Payments   | Razorpay Python SDK 1.4 |
| Receipts   | ReportLab (PDF generation) |
| Frontend   | React 19 · TypeScript 5.7 · Vite 6 · React Router 7 · Motion (animation) |
| Testing    | pytest + pytest‑django (backend) · Vitest + Testing Library (frontend) |
| Production | gunicorn · environment‑driven settings |

## Security & RBAC

- **Custom user model** with email as the login identifier and a mandatory `role` field (`DONOR | CHARITY | VOLUNTEER | ADMIN`).
- **Deny‑by‑default**: DRF is configured with `IsAuthenticated` as the default permission class; public read endpoints opt in explicitly.
- **Object‑level authorization**: a charity user can only manage their own organization and its campaigns/opportunities; verification approve/reject is restricted to admins; a charity cannot verify itself.
- **Hashing**: Django's password hashers handle all credentials — nothing is stored in plaintext.
- **Secrets by environment only**: `SECRET_KEY`, `DATABASE_URL`, `REDIS_URL`, Razorpay credentials, and Celery settings are read from environment variables at runtime. Defaults in `settings.py` are explicit non‑functional placeholders.
- **JWT hardening**: rotating refresh tokens with blacklisting, `SIGNING_KEY` tied to `SECRET_KEY`.
- **Payment integrity**: server‑side signature verification for both checkout callbacks and webhooks; **idempotency keys** prevent duplicate charges; the campaign `raised_amount` is updated atomically (`F()` expression) inside a transaction.

## Donation & payment architecture

1. Donor opens a **campaign** and chooses an amount → the frontend calls the donations API.
2. The backend validates the campaign is **ACTIVE**, creates a **Razorpay order**, and stores a `PENDING` donation record with a unique `idempotency_key`.
3. The frontend launches **Razorpay Checkout** with the key ID provided by `VITE_RAZORPAY_KEY_ID` (test key in development).
4. On success the client sends the `payment_id` + `signature`; the backend **verifies the signature** and, on success, marks the donation SUCCESS and **atomically increments** the campaign's raised amount.
5. **Webhooks** (`payment.captured` / `order.paid`) are signature‑verified and processed idempotently — a webhook arriving after a completed checkout simply no‑ops.
6. A receipt is generated for the successful donation and the donor is notified.

Every money‑movement path is guarded by signature verification and idempotency so retries, duplicate webhooks, and replays cannot double‑count.

## Campaign management

- Campaigns must belong to a **verified** charity organization.
- Lifecycle is enforced with validated transitions: a draft can go active or cancelled; an active campaign can complete, expire, or be cancelled; terminal states are final.
- `goal_amount` must be positive (DB check constraint) and `raised_amount` is **never writable through campaign APIs** — it is owned by the donations domain.
- Charities can attach a cover image and publish updates; updates notify interested donors.

## Organization verification

1. A charity owner creates an organization profile and **submits** it for verification.
2. An **admin** reviews it via the dedicated endpoints and **approves** or **rejects** it (with a required reason on rejection).
3. A rejected organization can fix issues and **resubmit**.
4. Every action is recorded in a `verification_logs` audit trail with who did what and when.

Only verified organizations can appear in the public campaign discovery feed and raise funds.

## Volunteer workflow

- **Charities** publish volunteer opportunities (title, description, location, event date, slots, optional linked campaign).
- **Volunteers** browse open opportunities and apply with a statement.
- Applications move through `PENDING → APPROVED → REJECTED / ATTENDED`; a volunteer can apply to each opportunity only once.
- Both sides receive notifications on approval/rejection.

## Transparency & impact tracking

- Every **successful donation** is reflected immediately and atomically in the campaign's raised total.
- **Numbered receipts** give donors an auditable record of each contribution.
- **Campaign updates** give an ongoing narrative of how funds are used.
- Public **analytics** endpoint reports donations by category and campaign success rates.
- The **charity dashboard** shows funds raised across an organization's campaigns; the **donor dashboard** shows lifetime giving.

## Testing & quality

**Backend** — pytest + pytest‑django suites covering:

- authentication (register/login/refresh/logout/me), models, and custom JWT integration
- charity verification workflow (submit/approve/reject/resubmit, permissions, audit history)
- campaigns (lifecycle transitions, ownership rules, image handling, updates & notifications)
- donations (payment initiation, signature verification, webhook idempotency)
- dashboards and analytics
- receipts API and PDF generation
- volunteers (opportunities, applications, authorization)

**Frontend** — Vitest + React Testing Library covering components, hooks, auth context, services, formatters, and every role‑gated page, plus ESLint and a strict `tsc` typecheck in the build.

```bash
# Backend suite
cd backend
pytest

# Frontend suite
cd frontend
npm test
```

## Current progress

Legend: ✅ Implemented/complete · 🟢 In progress · 🟡 Partially implemented (blocked on an upstream piece) · 🔜 Planned.

| Module | Status |
|---|---|
| Donor Experience | ✅ Complete |
| Charity Experience | 🟢 In Progress |
| Volunteer Experience | 🟢 In Progress |
| Admin Experience | 🔜 Upcoming |
| Organization Verification | 🟡 Admin workflow pending |
| Campaign Management | 🟢 In Progress |
| Donation/Payment Flow | 🟢 Implemented — Razorpay test credentials required |
| ML/Intelligence Layer | 🔜 Planned |

**Implemented:** authentication & JWT, donor app (browse, donate, history, receipts, notifications), charity organization profiles and verification API, campaign creation/management/updates, Razorpay orders + signature/webhook verification, PDF receipts, volunteer opportunities and applications, in‑app notifications (Celery), dashboards and public analytics, role‑gated frontend routing, dev seed data.

**In progress:** the charity console polish, volunteer experience refinements, and deeper campaign tooling are actively being developed.

**Planned:** admin console UI, enhanced verification review tooling, donation impact reporting, and the machine‑learning/intelligence layer (see Roadmap).

## Roadmap

- **Admin Experience** — a full admin console: verification review queue, moderation, and system‑wide reporting.
- **Verified Impact Reporting** — per‑campaign impact stories, milestone reports, and public transparency pages.
- **Donation Experience** — recurring donations, one‑tap repeat giving, and India/U.K. tax‑receipt formatting.
- **ML / Intelligence Layer** — donation‑trend analytics, smart campaign recommendations, anomaly detection for verification review, and fraud signals on donation flow. *Planned; not yet implemented.*
- **Search & Filters** — richer campaign discovery (location, category, impact tags).
- **Deployment** — containerized deployment with PostgreSQL/Redis, storage for media, and CI pipelines.

## Local development setup

### Prerequisites

- Python 3.12+ and pip
- Node.js 18+ and npm
- (Optional) PostgreSQL and Redis — not required for getting started; the defaults let you run with SQLite and an in‑memory setting.

### Backend

```bash
cd backend

# 1. Create and activate a virtual environment
python -m venv .venv
# Windows (PowerShell):  .venv\Scripts\Activate.ps1
# macOS / Linux:         source .venv/bin/activate

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Configure environment
#    Windows:  copy .env.example .env
#    macOS/Linux: cp .env.example .env
#    Then edit .env with your own values (dummy placeholders are safe to start with).

# 4. Create the database schema
python manage.py migrate

# 5. (Optional) Seed verified charities and ACTIVE campaigns for local testing
python manage.py seed_dev_data

# 6. Start the API
python manage.py runserver
```

The API is now available at `http://localhost:8000/api/v1/`.

### Frontend

```bash
cd frontend

npm install

# (Optional) copy the frontend env example for API override / Razorpay key
#   Windows:  copy .env.example .env
#   macOS/Linux: cp .env.example .env
#   Then start:
npm run dev
```

The app runs at `http://localhost:3000`. It calls the API directly at `http://localhost:8000` — the backend CORS whitelist covers the `http://localhost:3000` origin.

## Environment configuration

All secrets are **environment variables** — never committed.

### Backend — `backend/.env.example`

The repository ships a safe example at [`backend/.env.example`](backend/.env.example) with clearly‑marked placeholders. Copy it to `.env` and fill in real values locally:

| Variable | Purpose |
| -------- | ------- |
| `DEBUG` | Django debug flag (keep `True` in dev, `False` in production) |
| `SECRET_KEY` | Django signing key — **generate a strong random value**, never reuse |
| `ALLOWED_HOSTS` | Comma‑separated allowed hostnames |
| `DATABASE_URL` | e.g. `postgres://user:password@localhost:5432/trustfund` |
| `REDIS_URL` | Redis URL used by Celery |
| `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` | Celery broker and result backend |
| `CELERY_TASK_ALWAYS_EAGER` / `CELERY_TASK_EAGER_PROPAGATES_EXCEPTIONS` | Run Celery tasks synchronously during development |
| `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` | Frontend origins to allow (dev: `http://localhost:3000`) |
| `EMAIL_URL` | e.g. `console://` in dev or `smtps://user:pass@host:587` in production |
| `RAZORPAY_KEY_ID` | Razorpay key ID (**test key** in development) |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret (**test secret** in development) |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook signing secret |
| `SECURE_SSL_REDIRECT` / `SESSION_COOKIE_SECURE` / `CSRF_COOKIE_SECURE` | Production security flags |

### Frontend — `frontend/.env.example`

The frontend reads Vite environment variables (`import.meta.env.VITE_*`). A safe example at [`frontend/.env.example`](frontend/.env.example) documents them:

| Variable | Purpose |
| -------- | ------- |
| `VITE_API_BASE_URL` | Base URL of the Django API (defaults to `http://localhost:8000`) |
| `VITE_RAZORPAY_KEY_ID` | Razorpay key ID used by the checkout — **test key** in development |

## Security notes

- **Never commit real credentials.** Real API keys, `SECRET_KEY`s, database passwords, or payment secrets must live only in environment variables / a local `.env` file that is git‑ignored.
- `.env` files are git‑ignored; only the placeholder `.env.example` files are tracked.
- For production: run gunicorn (never `runserver`), set `DEBUG=False`, use PostgreSQL + Redis, configure secure cookies/SSL, and generate a fresh `SECRET_KEY`.
- Use **Razorpay test keys** for development and only ever configure **live keys** in a private, protected production environment.
- This project has not yet been penetration‑tested; treat it as a development‑stage codebase.

## License

Released under the [MIT License](LICENSE). © 2026 Abi Thomas.