# Church Management System (CMS)

A modern, cloud-based Church Management System built from the SRS in
`Church_Management_System_SRS.md`. It manages members, families, attendance,
finance, departments, events, prayer & counseling, assets, reports, and
administration through a single platform.

## Tech stack

| Layer    | Technology                                             |
| -------- | ------------------------------------------------------ |
| Frontend | Next.js (App Router) · React · TypeScript · Tailwind CSS · Recharts · Framer Motion |
| Backend  | NestJS · Prisma ORM · JWT auth (RBAC) · TOTP 2FA · Swagger |
| Database | PostgreSQL 16 (native Windows service) |
| Cache    | Redis (via Docker Compose, optional for current features) |

> **Database note:** PostgreSQL 16 runs as a native Windows service
> (`postgresql-x64-16`) — no Docker/WSL required. The app connects as user
> `cms_user` to database `church_db` on `localhost:5432`. The Prisma schema
> (`backend/prisma/schema.prisma`) uses PostgreSQL enums. `docker-compose.yml`
> can still start PostgreSQL + Redis if you later prefer containers.

## Prerequisites

- Node.js 18+ (tested on 22)
- npm
- PostgreSQL 16 running on `localhost:5432` (see Database setup below)

## Database setup (one-time)

PostgreSQL is installed as a Windows service and the app database already
exists on this machine. If you need to recreate it from scratch:

```powershell
# as the postgres superuser
CREATE ROLE cms_user LOGIN PASSWORD 'your_password' CREATEDB;
CREATE DATABASE church_db OWNER cms_user;

# from backend/ with DATABASE_URL set in .env
npx prisma migrate dev --name init
npm run seed
```

## Getting started

```powershell
# 1. Install dependencies, generate the Prisma client, migrate, and seed
npm run setup

# 2. Start the backend (NestJS on http://localhost:3002/api)
npm run dev:backend

# 3. In a second terminal, start the frontend (Next.js on http://localhost:3001)
npm run dev:frontend
```

Open http://localhost:3001 and sign in.

### Production build & start

```powershell
npm run build
npm run start:backend
npm run start:frontend
```

### Swagger API docs

http://localhost:3002/api/docs (development only)

### Health check

http://localhost:3002/api/health

## Demo accounts

All seeded users share the password `Password123!`.

| Role                 | Email                      |
| -------------------- | -------------------------- |
| Super Administrator  | superadmin@church.org      |
| Church Administrator | admin@church.org           |
| Senior Pastor        | pastor@church.org          |
| Pastor               | associate@church.org       |
| Finance Officer      | finance@church.org         |
| Department Leader    | leader@church.org          |
| Member               | member@church.org          |

The login page has one-click buttons for each demo account.

## Modules

- **Dashboard** — KPIs, attendance trend, service breakdown, membership status,
  recent activity.
- **Members** — profiles, family groups, membership status, QR ID cards,
  CSV import/export, search & filters.
- **Birthdays** — upcoming birthdays (today / this week / this month) with
  ages and a dashboard widget.
- **Attendance** — check-in by service type (Sunday, Midweek, Prayer, Event),
  manual or QR, summaries and history.
- **Services** — reusable service-day schedules (name, weekday, start time) and
  setting the service for a specific date.
- **Visitors** — guest and first-timer records with follow-up tracking and
  CSV export.
- **Children** — children and guardian records with ministry assignments and
  CSV export.
- **Podcasts** — sermon/conversation episode library with speakers, series,
  publish dates, duration and publish/archive workflow.
- **Finance** — tithes, offerings, donations, expenses, monthly trends,
  income/expense reports.
- **Departments** — Choir, Youth, Ushers, Media, Children's Ministry,
  Women's & Men's Fellowship, with member assignments.
- **Events** — registration, attendance marking, printable certificates,
  capacity-based waitlist.
- **Prayer & Counseling** — prayer requests with status workflow, counseling
  session scheduling and follow-up.
- **Assets** — equipment, vehicles, buildings, condition tracking, maintenance
  history.
- **Communication** — bulk SMS, email and phone-call campaigns with audience
  filters (department, gender, city, membership status), scheduled sends,
  delivery logs, and live recipient counts.
- **Reports** — membership, attendance, finance, events; CSV exports.
- **Administration** — user & role management, 2FA setup, audit logs.

## Security

- JWT authentication with role-based access control (RBAC) across all modules.
- TOTP two-factor authentication (setup via QR code in Settings).
- Audit logging of login, create, update, and delete actions.
- Passwords hashed with bcrypt.
- Helmet security headers on backend.
- Custom security headers on frontend (X-Frame-Options, HSTS, etc.).

## Communication delivery (SMS / Email / Calls)

Campaigns are delivered through real providers. Configure them in `backend/.env`:

| Variable | Provider | Used for |
| -------- | -------- | -------- |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `MAIL_FROM` | Resend | Email campaigns |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_FROM` | Twilio | SMS campaigns |
| `TWILIO_CALL_FROM` | Twilio | Programmatic voice calls (reads the call script via TwiML) |
| `AT_USERNAME`, `AT_API_KEY`, `AT_SMS_FROM`, `AT_CALL_FROM` | Africa's Talking | SMS and voice calls (Ghana & Africa) |

If a provider is not configured, the affected messages are recorded as `FAILED`
with a clear error (e.g. "Twilio not configured…") and the campaign is marked
`FAILED`/`PARTIAL` — nothing is silently dropped. Scheduled campaigns run on a
per-minute cron. See `.env.example` for a full template.

## Project structure

```
backend/               NestJS API
  prisma/schema.prisma         PostgreSQL schema
  prisma/seed.ts               demo data + users
  src/auth/                    login, JWT, 2FA
  src/health/                  health check endpoint
  src/members/ attendance/ finance/ departments/ events/
  src/prayer/ assets/ reports/ dashboard/ audit/ users/
frontend/              Next.js app
  app/(app)/           protected pages (dashboard, modules, admin)
  components/          shared UI + sidebar
  lib/api.ts           typed API client (JWT)
  lib/auth.tsx         auth context
docker-compose.yml     PostgreSQL 16 + Redis 7
```

## API overview (all under `/api`)

- `GET /health` — Health check
- `POST /auth/login` · `GET /auth/me` · `POST /auth/2fa/setup|enable|disable`
- `POST /auth/forgot-password` · `POST /auth/reset-password`
- `GET /members` · `GET/POST /members` · `PATCH/DELETE /members/:id` · `GET /members/birthdays`
- `GET /members/families` · `POST /members/import` · `GET /members/export/csv`
- `POST /attendance/checkin` · `GET /attendance`
- `GET/POST /services` · `POST /services/today` · `DELETE /services/today/:date`
- `GET/POST /visitors` · `PATCH/DELETE /visitors/:id` · `POST /visitors/:id/follow-up` · `POST /visitors/:id/convert/:memberId` · `GET /visitors/export`
- `GET/POST /children` · `PATCH/DELETE /children/:id` · `GET /children/export`
- `GET/POST /podcasts` · `PATCH/DELETE /podcasts/:id` · `POST /podcasts/:id/publish|archive`
- `GET/POST /finance` · `GET /finance/summary|monthly`
- `GET/POST /departments` · `POST /departments/:id/members`
- `GET/POST /events` · `POST /events/:id/register`
- `GET/POST /prayer/requests` · `GET/POST /prayer/counseling`
- `GET/POST /assets` · `POST /assets/:id/maintenance`
- `GET /reports/membership|attendance|finance|events` · `GET /reports/export/...`
- `GET/POST /communications` · `GET /communications/:id` · `POST /communications/:id/cancel` · `GET /communications/audience-count`
- `GET /dashboard/kpis|attendance-trend|attendance-by-service|demographics|recent-activity`
- `GET /churches/me` · `PATCH /churches/:id` · `PATCH /churches/:id/location`
- `GET/POST/PATCH/DELETE /users` · `GET /audit`
