# Tuition Bureau CRM

A multi-tenant, white-label, zero-database CRM and smart-matching platform engineered specifically for Indian home tuition bureaus. The system uses **Google Sheets** as its structured operational datastore and **Cloudinary** for private, authenticated document and photograph storage, running on **Next.js 14 App Router** and **TypeScript** deployed to **Vercel**.

---

## 1. System Overview

Home tuition bureaus in India traditionally manage hundreds of tutors, parents, and student requests across unstructured WhatsApp messages, paper diaries, and ad-hoc spreadsheets. The Tuition Bureau CRM bridges this gap with an enterprise-grade operational workflow without requiring a dedicated SQL database:

- **Zero-Database Architecture:** Google Sheets v4 acts as the single source of truth for tabular records. Business owners retain 100% control and ownership of their raw data within their personal or corporate Google Workspace account.
- **Strict Multi-Tenant Isolation:** Every client bureau runs an independent deployment with dedicated Google Sheets, Cloudinary accounts, environment credentials, and custom branding configs in `clients/<client_id>/`.
- **Smart Matching Engine (Tutor Finder):** Deterministic, multi-factor scoring algorithm (0–100 points) evaluating exact and neighboring locality links, subject coverage, board compatibility, budget tolerance, timing flexibility, tutor experience, and 90-day confirmation freshness.
- **Rigorous KYC & Aadhaar Verification:** Purpose-built verification panel featuring side-by-side document viewers (short-lived 10-minute signed URLs) comparing tutor credentials and government ID proofs against submitted profiles.
- **Indian DPDP Act (2023) Compliance:** Explicit parental consent capture for minors, tutor consent logging (`consent_at`, `consent_version`), private authenticated asset storage, full audit trails in `ActivityLog`, and one-click cryptographic record anonymization.
- **Formula-Safe Backups:** One-click full database ZIP export generating sanitized CSVs across all 11 tabs, with CSV formula injection mitigation (`'`, `=`, `+`, `-`, `@`).

---

## 2. High-Level Architecture

The platform strictly enforces the **Repository Pattern** to decouple the presentation layer and domain services from Google Sheets API details:

```
┌────────────────────────────────────────────────────────┐
│        Browser (Public Forms / Admin Dashboard)        │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP (HTTPS / JSON / Multi-part)
┌───────────────────────────▼────────────────────────────┐
│          Next.js 14 Route Handlers (/api/...)          │
│   • Auth Check (jose Signed HTTP-only Cookie)          │
│   • CSRF / Origin Validation                           │
│   • Strict Zod Schema Validation                       │
└───────────────────────────┬────────────────────────────┘
                            │ Typed Domain Objects
┌───────────────────────────▼────────────────────────────┐
│                    Domain Services                     │
│   • Smart Matching Engine   • Verification Service     │
│   • Assignment Lifecycle    • Activity Logger          │
│   • Anti-Spam & Rate Limiter (Token Bucket / Redis)    │
└───────────────────────────┬────────────────────────────┘
                            │ Repo<T> Interface Boundary
┌───────────────────────────▼────────────────────────────┐
│                  Repository Layer                      │
│   • StudentRepo             • TutorRepo                │
│   • AssignmentRepo          • LookupRepo               │
└───────────────────────────┬────────────────────────────┘
                            │ Abstracted CRUD Operations
┌───────────────────────────▼────────────────────────────┐
│              GoogleSheetsAdapter & Storage             │
│   • Header-by-Name Mapping  • 30s Caching Layer        │
│   • Optimistic Concurrency  • Mutex Write Lock         │
│   • Exponential Retries     • Cloudinary Authenticated │
└────────────────────────────────────────────────────────┘
```

---

## 3. Quick Start Guide

### Prerequisites
- **Node.js**: v18.17.0 or higher (LTS recommended)
- **Package Manager**: `npm` (v9+)
- **Google Cloud Platform**: A project with **Google Sheets API** enabled and a Service Account.
- **Cloudinary Account**: Configured for private/authenticated media uploads.
- **Google Sheet**: A clean spreadsheet shared with the Service Account email.

### Step 1: Clone and Install
```bash
git clone <repository-url>
cd "bussness management"
npm install
```

### Step 2: Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Populate the required environment variables:
```env
# Client selection (maps to clients/<CLIENT_ID>/config.ts)
CLIENT_ID=swati
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Google Sheets API (Service Account)
GOOGLE_SERVICE_ACCOUNT_EMAIL=sheets-crm@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
SPREADSHEET_ID=1A2B3C4D5E6F7G8H9I0J_your_spreadsheet_id_here

# Cloudinary (Private Uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz12345

# Admin Authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2a$10$... # Generated in Step 3
SESSION_SECRET=super-secret-random-string-at-least-32-chars-long

# Optional: Upstash Redis (For distributed mutex locking and rate limiting)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Optional: Cloudflare Turnstile
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

### Step 3: Generate Admin Password Hash
Run the interactive password hashing CLI:
```bash
npm run hash-password
```
Enter your desired admin password. Copy the resulting bcrypt hash into `ADMIN_PASSWORD_HASH` in `.env`.

### Step 4: Initialize the Google Sheet
Run the automated schema provisioning script to configure the 11 tabs, lock header rows, set RAW text formatting, and seed starter lookups:
```bash
npm run setup-sheet
```

### Step 5: Verify Sheet Health
Confirm that all tabs and columns match the specification:
```bash
npm run check-sheet
```

### Step 6: Start Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser:
- Public Landing: `http://localhost:3000/`
- Student Registration: `http://localhost:3000/student-registration`
- Tutor Registration: `http://localhost:3000/tutor-registration`
- Admin Login: `http://localhost:3000/login`

---

## 4. Available CLI Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the Next.js development server at `localhost:3000` with hot-reloading. |
| `npm run build` | Compiles the production application bundle and validates TypeScript typings. |
| `npm run start` | Boots the compiled Next.js production server. |
| `npm run lint` | Executes ESLint to check code quality and syntax rules. |
| `npm run typecheck` | Runs the TypeScript compiler (`tsc --noEmit`) across the entire codebase. |
| `npm run test` | Executes the Vitest test suite in single-run mode. |
| `npm run test:watch` | Runs Vitest in watch mode for test-driven development. |
| `npm run setup-sheet` | Connects to the configured Google Sheet, creates missing tabs, freezes row 1, sets headers, writes `Meta.schema_version`, and seeds starter `Lookups`. Non-destructive. |
| `npm run check-sheet` | Validates every tab's header row against `schema.ts`. Exits with code 1 if columns are missing or misnamed. |
| `npm run hash-password` | Interactive CLI to hash an administrative password using `bcryptjs` with salt rounds = 10. |

---

## 5. Directory & File Map

```
.
├── .env.example                     # Environment template with dummy keys
├── package.json                     # Project scripts and dependencies
├── tailwind.config.ts               # Tailwind CSS theme with client token injection
├── tsconfig.json                    # Strict TypeScript compiler options
├── vitest.config.ts                 # Unit and integration test configuration
│
├── clients/                         # White-label client configurations
│   ├── _template/                   # Starter template for new bureau onboardings
│   │   └── config.ts                # Branding, contact info, and feature flags
│   └── swati/                       # Active client implementation example
│       └── config.ts
│
├── docs/                            # Section 30 Comprehensive Documentation Suite
│   ├── DEPLOYMENT.md                # GCP, Cloudinary, Vercel & environment setup
│   ├── CLIENT-ONBOARDING.md         # Operational onboarding checklist & 3 questions
│   ├── ADMIN-GUIDE.md               # Plain-language bureau owner operating guide
│   ├── privacy-policy-template.md   # Indian DPDP Act 2023 compliant policy template
│   ├── DATA-REQUESTS.md             # Subject Access Request (SAR) & erasure SOP
│   ├── BACKUP-RESTORE.md            # ZIP export format and CSV sheet disaster recovery
│   └── ARCHITECTURE.md              # Repository pattern, concurrency & PostgreSQL migration
│
├── scripts/                         # Operational CLI automation scripts
│   ├── check-sheet.ts               # Sheet schema integrity checker
│   ├── hash-password.ts             # Admin bcrypt hash generator
│   └── setup-sheet.ts               # Google Sheets schema initializer & lookup seeder
│
├── src/
│   ├── app/                         # Next.js 14 App Router pages & API handlers
│   │   ├── (auth)/login/            # Secure administrative login screen
│   │   ├── (public)/                # Public student/tutor intake forms & privacy page
│   │   ├── api/                     # Backend endpoints (public intake, admin CRUD, files)
│   │   └── dashboard/               # Administrative back-office suite
│   │       ├── assignments/         # Assignment lifecycle & demo tracking
│   │       ├── followups/           # Actionable student & tutor follow-up board
│   │       ├── overview/            # Operational KPI overview & activity stream
│   │       ├── reports/             # Demand vs Supply shortage analytics & CSV exports
│   │       ├── settings/            # Tab lookups, matching weights, safety & backups
│   │       ├── students/            # Student lead pipeline & requirement management
│   │       ├── tutor-finder/        # Multi-factor smart matching engine interface
│   │       └── tutors/              # Tutor directory & side-by-side verification panel
│   │
│   ├── components/                  # Reusable UI primitives and layout structures
│   │   ├── forms/                   # Validated public & administrative form components
│   │   ├── layout/                  # Responsive admin sidebar, header, and drawer
│   │   └── ui/                      # Buttons, badges, modals, toast, and inputs
│   │
│   ├── config/                      # Dynamic client configuration loaders
│   │   └── client-config.ts         # Runtime client resolver and Zod validator
│   │
│   ├── lib/                         # Core library infrastructure
│   │   ├── activity-log/            # Tamper-evident admin action logger
│   │   ├── google-sheets/           # Client, adapter, schema, header mapping, and cache
│   │   ├── i18n/                    # Bilingual English/Hindi dictionary and hooks
│   │   ├── repository/              # Repository contracts & in-memory test mocks
│   │   ├── security/                # Anti-spam, honeypot, and IP rate limiters
│   │   └── validation/              # Strict Zod schemas for all domain entities
│   │
│   └── types/                       # Universal TypeScript domain interfaces
│       ├── client.ts                # ClientConfig specification
│       ├── entities.ts              # Student, Tutor, Assignment, Payment schemas
│       ├── tutor-field-registry.ts  # Configurable tutor intake field registry
│       └── vocab.ts                 # Fixed system statuses and lookup types
│
└── tests/                           # Vitest test suites
    ├── phase0-foundation.test.ts    # Config and environment validations
    └── phase1-database.test.ts      # Header mappings, sanitization, and repo tests
```

---

## 6. Documentation Suite Reference

For in-depth operational and engineering runbooks, refer to the dedicated manuals in `docs/`:

1. **[Deployment Guide](docs/DEPLOYMENT.md):** Complete guide for setting up GCP Service Accounts, Cloudinary private buckets, Vercel deployments, and environment variables.
2. **[Client Onboarding Checklist](docs/CLIENT-ONBOARDING.md):** Step-by-step workflow for onboarding a new client bureau, answering the 3 core questions, seeding lookups, and running pre-flight checks.
3. **[Admin User Guide](docs/ADMIN-GUIDE.md):** Plain-language operational manual for bureau owners covering verification, matching, demo tracking, and WhatsApp engagement.
4. **[Privacy Policy Template](docs/privacy-policy-template.md):** Ready-to-publish Indian DPDP Act (2023) privacy statement covering minor data, parental consent, and Aadhaar privacy.
5. **[Data Subject Requests Runbook](docs/DATA-REQUESTS.md):** Standard Operating Procedure (SOP) for handling Right-to-be-Forgotten requests and cryptographic record anonymization.
6. **[Backup & Disaster Recovery Protocol](docs/BACKUP-RESTORE.md):** Step-by-step instructions for weekly ZIP exports and complete sheet restoration from CSV backups.
7. **[System Architecture & PostgreSQL Migration](docs/ARCHITECTURE.md):** Deep-dive into the repository pattern, concurrency safeguards, and migrating from Sheets to PostgreSQL.

---

## 7. License & Compliance Notice

This software is proprietary and confidential. Licensed exclusively for authorized tuition bureau client deployments.

**Regulatory Notice:** Deployment of this system within the territory of India requires compliance with the **Digital Personal Data Protection Act, 2023 (DPDP Act)** and the **Aadhaar Act, 2016**. Government identification copies must never be delivered over unauthenticated public endpoints. Always maintain the Cloudinary authenticated delivery profile mandated by this codebase.
