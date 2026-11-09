# System Architecture & Storage Engine Abstraction

This document explains the software architecture of the Tuition Bureau CRM, focusing on the **Repository Pattern**, the **Google Sheets Storage Engine**, **Optimistic Concurrency Control**, and the step-by-step procedure for migrating to **PostgreSQL**.

---

## 1. Architectural Philosophy & Layering

The Tuition Bureau CRM is structured according to **Clean Architecture** principles. Presentation components and domain business logic are strictly decoupled from physical datastore mechanisms.

```
┌─────────────────────────────────────────────────────────────────┐
│                     Presentation Layer                          │
│   • Public Registration Forms (React Hook Form + Zod)           │
│   • Admin Back-Office Dashboard (Tailwind CSS + Server Comp.)   │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP Fetch / Server Actions
┌───────────────────────────────▼─────────────────────────────────┐
│               Next.js Route Handlers (/api/...)                 │
│   • Auth Verification (jose JWT Session Cookie)                 │
│   • CSRF / Origin Verification                                  │
│   • Zod Schema Input Sanitization & Validation                  │
└───────────────────────────────┬─────────────────────────────────┘
                                │ Typed Domain Models
┌───────────────────────────────▼─────────────────────────────────┐
│                     Domain Services Layer                       │
│   • Smart Matching Service (Tutor Finder Multi-Factor Scorer)   │
│   • Verification & KYC Service                                  │
│   • Assignment & Demo Lifecycle Engine                          │
│   • Activity Logger (Tamper-evident audit writer)               │
└───────────────────────────────┬─────────────────────────────────┘
                                │ Repository Contract Calls
┌───────────────────────────────▼─────────────────────────────────┐
│                  Repository Interface (Repo<T>)                 │
│   • StudentRepo               • TutorRepo                       │
│   • AssignmentRepo            • FollowUpRepo                    │
│   • PaymentRepo               • LookupRepo                      │
└───────────────────────────────┬─────────────────────────────────┘
                                │ Pluggable Adapter Implementation
      ┌─────────────────────────┴─────────────────────────┐
      │                                                   │
┌─────▼─────────────────────────┐   ┌─────────────────────▼─────┐
│      GoogleSheetsAdapter      │   │      PostgresAdapter      │
│  (Default V1 Production)      │   │  (High-Scale V2 Engine)   │
│  • Batch reads & 30s cache    │   │  • Connection pooling     │
│  • Mutex write-lock           │   │  • Relational integrity   │
│  • Header-by-name mapping     │   │  • ACID transactions      │
│  • Optimistic concurrency     │   │  • Sub-10ms query times   │
└───────────────────────────────┘   └───────────────────────────┘
```

### Golden Architectural Rule
**The presentation layer and domain services must NEVER import or interact with Google Sheets SDKs or SQL queries directly.** All data operations must flow through the abstract `Repo<T>` interface. This ensures the entire database engine can be swapped or tested with in-memory mocks without altering a single line of business logic.

---

## 2. The Repository Contract (`Repo<T>`)

Every domain entity (`Student`, `Tutor`, `Assignment`, `FollowUp`, `Payment`, `Lookup`) implements the unified `Repo<T>` contract:

```typescript
export interface Repo<T> {
  /**
   * Retrieves all records, optionally filtering out archived entries.
   */
  list(opts?: { includeArchived?: boolean }): Promise<T[]>;

  /**
   * Retrieves a single entity by its unique business ID (e.g. STU-10001).
   */
  getById(id: string): Promise<T | null>;

  /**
   * Persists a newly created entity, returning the fully populated record.
   */
  create(data: Omit<T, "id" | "created_at" | "updated_at">): Promise<T>;

  /**
   * Updates an existing entity.
   * Enforces Optimistic Concurrency Control: rejects if expectedUpdatedAt
   * does not match the live record timestamp in the datastore.
   */
  update(id: string, patch: Partial<T>, expectedUpdatedAt: string): Promise<T>;

  /**
   * Performs soft deletion by marking archived = true.
   */
  archive(id: string): Promise<void>;
}
```

---

## 3. Google Sheets Adapter Deep-Dive

Google Sheets is an unconventional operational datastore. To make it perform reliably under production workloads, the `GoogleSheetsAdapter` implements specialized reliability mechanisms:

### 3.1 Header-by-Name Mapping (Column Resiliency)
- **Problem:** In spreadsheets, users or administrators may manually insert, delete, or reorder columns.
- **Solution:** The adapter never identifies columns by alphabetical index (e.g., Column `C` or Column `AZ`). On initial read, it inspects Row 1 to build a dynamic mapping:
  `headerMap: Map<string, number>` (e.g., `'phone' => 5`).
- Unrecognized or additional columns are safely ignored. Columns can be reordered in the sheet without breaking the CRM.

### 3.2 Whole-Tab Batch Reads with 30-Second Caching
- **Problem:** Google Sheets API enforces a quota of 300 requests per minute per project. Fetching records row-by-row exhausts this limit within seconds.
- **Solution:** The adapter issues a single `spreadsheets.values.get` request for the entire sheet tab (e.g., `Students!A1:AB1000`).
- Results are cached in memory (or Upstash Redis if configured) with a **30-second TTL**.
- **Write-Through Invalidation:** Whenever a write occurs (`create`, `update`, `archive`), the adapter immediately evicts the cache for that tab.
- **Freshness Override:** Critical security operations (verifying a tutor or checking demo assignment status) bypass the cache and force a live read (`skipCache: true`).

### 3.3 Dynamic Row Discovery & Raw Insertion
- A record is **never** identified by its spreadsheet row number.
- When `update(id, ...)` is called, the adapter scans the ID column to re-discover the exact row currently holding that ID, accounting for any rows manually inserted or deleted by the owner.
- Writes always use `valueInputOption: "RAW"` to prevent Google Sheets from interpreting strings starting with `+91` or `=` as arithmetic expressions or numbers.

### 3.4 Multi-Value Delimiting
Fields containing multiple selections (such as `subjects`, `classes`, `boards`, `localities`) are stored in single cells delimited by the pipe character `|` (e.g., `MATHEMATICS|PHYSICS|CHEMISTRY`).
The adapter provides universal transformation utilities:
```typescript
export function splitMulti(cellValue?: string): string[] {
  if (!cellValue) return [];
  return cellValue.split("|").map(s => s.trim()).filter(Boolean);
}

export function joinMulti(values: string[]): string {
  return values.map(s => s.trim()).filter(Boolean).join("|");
}
```

### 3.5 Mutex Lock & Exponential Backoff
- When Upstash Redis is configured, write operations acquire a short-lived distributed mutex lock (`SET lock:sheet:<id> NX PX 10000`) ensuring serialized writes.
- Network requests against the Google Sheets API intercept HTTP 429 (Rate Limit) and HTTP 5xx (Server Error) responses, retrying up to 4 times with exponential backoff: **1s, 2s, 4s, 8s**.

---

## 4. Optimistic Concurrency Control (OCC)

In a multi-user bureau environment, two administrators might open the same student record simultaneously. Without concurrency controls, Admin B saving their changes would silently overwrite edits made moments earlier by Admin A.

```
Admin A                              Datastore                             Admin B
   │                                     │                                    │
   │─── Fetch Student (v1) ─────────────>│                                    │
   │    updated_at: 10:00:00             │<─── Fetch Student (v1) ────────────│
   │                                     │     updated_at: 10:00:00           │
   │                                     │                                    │
   │─── Save Edit (expected: 10:00:00) ─>│                                    │
   │    SUCCESS!                         │                                    │
   │    New updated_at: 10:01:15         │                                    │
   │                                     │                                    │
   │                                     │<─── Save Edit (expected: 10:00:00) │
   │                                     │     REJECTED (409 Conflict) ───────│
   │                                     │     "Record changed by someone     │
   │                                     │      else. Reload and try again."  │
```

### How OCC is Enforced:
1. When any edit modal loads, it captures the entity's current `updated_at` timestamp.
2. When the update request is submitted, it passes `expectedUpdatedAt`.
3. The adapter compares `liveRecord.updated_at === expectedUpdatedAt`.
4. If the timestamps do not match, the adapter throws `OptimisticConcurrencyError`.
5. The API route returns HTTP `409 Conflict` with a user-friendly error message:
   *"This record was updated by another administrator while you were editing. Please refresh the page to view the latest data."*

---

## 5. Migrating to PostgreSQL

When a tuition bureau exceeds **10,000 active records** or whole-tab batch reads exceed 3 seconds, the bureau should transition to PostgreSQL.

### Step 5.1: Relational Database Schema (DDL)
Create the following PostgreSQL tables:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Students Table
CREATE TABLE students (
    student_id VARCHAR(32) PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    parent_name VARCHAR(100) NOT NULL,
    student_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    whatsapp VARCHAR(20),
    email VARCHAR(255),
    class VARCHAR(50) NOT NULL,
    board VARCHAR(50) NOT NULL,
    subjects TEXT[] NOT NULL,
    school_name VARCHAR(150),
    tuition_type VARCHAR(30) NOT NULL,
    locality VARCHAR(100) NOT NULL,
    tutor_gender_preference VARCHAR(20) NOT NULL,
    preferred_timing VARCHAR(50) NOT NULL,
    budget NUMERIC(10,2) NOT NULL,
    classes_per_week INT NOT NULL,
    academic_requirements TEXT,
    other_requirements TEXT,
    lead_status VARCHAR(50) NOT NULL DEFAULT 'NEW',
    lead_source VARCHAR(50) NOT NULL,
    admin_notes TEXT,
    consent_at TIMESTAMPTZ NOT NULL,
    consent_version VARCHAR(50) NOT NULL,
    submission_key UUID NOT NULL,
    duplicate_of VARCHAR(32),
    archived BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_students_phone ON students(phone);
CREATE INDEX idx_students_status ON students(lead_status);
CREATE INDEX idx_students_locality ON students(locality);

-- 2. Tutors Table
CREATE TABLE tutors (
    tutor_id VARCHAR(32) PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    whatsapp VARCHAR(20),
    email VARCHAR(255),
    gender VARCHAR(20) NOT NULL,
    dob DATE,
    current_city VARCHAR(100) NOT NULL,
    current_locality VARCHAR(100) NOT NULL,
    address TEXT,
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(10) DEFAULT '+91',
    highest_qualification VARCHAR(100) NOT NULL,
    specialization VARCHAR(100),
    university VARCHAR(150),
    course VARCHAR(100),
    graduation_year INT,
    certifications TEXT,
    subjects TEXT[] NOT NULL,
    secondary_subjects TEXT[],
    classes TEXT[] NOT NULL,
    boards TEXT[],
    experience_years NUMERIC(4,1) NOT NULL DEFAULT 0,
    teaching_mode VARCHAR(30) NOT NULL,
    localities TEXT[] NOT NULL,
    expected_fee NUMERIC(10,2) NOT NULL,
    available_hours_per_week INT,
    available_timings TEXT[],
    available_days TEXT[],
    introduction TEXT,
    linkedin_url VARCHAR(255),
    resume_file_id VARCHAR(255),
    photo_file_id VARCHAR(255),
    qualification_file_ids TEXT[],
    id_type VARCHAR(50),
    id_number VARCHAR(100),
    id_proof_file_id VARCHAR(255),
    address_proof_file_id VARCHAR(255),
    degree_proof_file_id VARCHAR(255),
    reference_name VARCHAR(100),
    reference_contact VARCHAR(100),
    background_check_status VARCHAR(50) DEFAULT 'NOT_APPLICABLE',
    verification_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    availability_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    verified_at TIMESTAMPTZ,
    verified_by VARCHAR(100),
    rejection_reason TEXT,
    blacklist_reason TEXT,
    admin_notes TEXT,
    lead_source VARCHAR(50) NOT NULL,
    consent_at TIMESTAMPTZ,
    consent_version VARCHAR(50),
    submission_key UUID,
    last_confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    custom_1 TEXT,
    custom_2 TEXT,
    custom_3 TEXT,
    custom_4 TEXT,
    custom_5 TEXT
);

CREATE INDEX idx_tutors_verification ON tutors(verification_status);
CREATE INDEX idx_tutors_availability ON tutors(availability_status);
CREATE INDEX idx_tutors_phone ON tutors(phone);

-- 3. Assignments Table
CREATE TABLE assignments (
    assignment_id VARCHAR(32) PRIMARY KEY,
    student_id VARCHAR(32) NOT NULL REFERENCES students(student_id),
    tutor_id VARCHAR(32) NOT NULL REFERENCES tutors(tutor_id),
    subjects TEXT[] NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(100) NOT NULL,
    assignment_status VARCHAR(50) NOT NULL DEFAULT 'SHORTLISTED',
    demo_at TIMESTAMPTZ,
    demo_status VARCHAR(50),
    start_date DATE,
    end_date DATE,
    agreed_fee NUMERIC(10,2),
    admin_notes TEXT
);

CREATE INDEX idx_assignments_student ON assignments(student_id);
CREATE INDEX idx_assignments_tutor ON assignments(tutor_id);
CREATE INDEX idx_assignments_status ON assignments(assignment_status);

-- 4. FollowUps Table
CREATE TABLE followups (
    followup_id VARCHAR(32) PRIMARY KEY,
    related_type VARCHAR(30) NOT NULL,
    related_id VARCHAR(32) NOT NULL,
    due_at TIMESTAMPTZ NOT NULL,
    followup_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    assigned_admin VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_followups_due ON followups(due_at) WHERE status = 'OPEN';

-- 5. Payments Table
CREATE TABLE payments (
    payment_id VARCHAR(32) PRIMARY KEY,
    student_id VARCHAR(32) REFERENCES students(student_id),
    tutor_id VARCHAR(32) REFERENCES tutors(tutor_id),
    assignment_id VARCHAR(32) REFERENCES assignments(assignment_id),
    payment_type VARCHAR(50) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_mode VARCHAR(50) NOT NULL,
    payment_status VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. ActivityLog Table
CREATE TABLE activity_log (
    activity_id VARCHAR(32) PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    admin_id VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(32) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    changes JSONB
);

CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);

-- 7. Lookups Table
CREATE TABLE lookups (
    lookup_type VARCHAR(50) NOT NULL,
    value VARCHAR(100) NOT NULL,
    label_en VARCHAR(150) NOT NULL,
    label_hi VARCHAR(150),
    sort_order INT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (lookup_type, value)
);

-- 8. LocalityLinks Table
CREATE TABLE locality_links (
    locality_a VARCHAR(100) NOT NULL,
    locality_b VARCHAR(100) NOT NULL,
    PRIMARY KEY (locality_a, locality_b)
);

-- 9. Settings Table
CREATE TABLE settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL
);

-- 10. MessageTemplates Table
CREATE TABLE message_templates (
    template_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    audience VARCHAR(30) NOT NULL,
    body TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Meta Table
CREATE TABLE meta (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL
);
```

### Step 5.2: Implementing the PostgreSQL Repository Adapter
Create `src/lib/repository/postgres-adapter.ts` implementing `Repo<T>`:

```typescript
import { Pool } from "pg";
import type { Repo } from "./repo.interface";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export class PostgresAdapter<T extends { id: string; updated_at: string }> implements Repo<T> {
  constructor(private tableName: string, private idColumn: string) {}

  async list(opts?: { includeArchived?: boolean }): Promise<T[]> {
    const query = opts?.includeArchived
      ? `SELECT * FROM ${this.tableName} ORDER BY created_at DESC`
      : `SELECT * FROM ${this.tableName} WHERE archived = FALSE ORDER BY created_at DESC`;
    const res = await pool.query(query);
    return res.rows as T[];
  }

  async getById(id: string): Promise<T | null> {
    const res = await pool.query(
      `SELECT * FROM ${this.tableName} WHERE ${this.idColumn} = $1`,
      [id]
    );
    return (res.rows[0] as T) || null;
  }

  async create(data: Omit<T, "id" | "created_at" | "updated_at">): Promise<T> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
    const cols = keys.join(", ");

    const query = `
      INSERT INTO ${this.tableName} (${cols}, created_at, updated_at)
      VALUES (${placeholders}, NOW(), NOW())
      RETURNING *
    `;
    const res = await pool.query(query, values);
    return res.rows[0] as T;
  }

  async update(id: string, patch: Partial<T>, expectedUpdatedAt: string): Promise<T> {
    // Optimistic Concurrency Check
    const existing = await this.getById(id);
    if (!existing) throw new Error("Record not found");
    if (existing.updated_at !== expectedUpdatedAt) {
      throw new Error("OptimisticConcurrencyError: Record changed by another session.");
    }

    const keys = Object.keys(patch).filter((k) => k !== this.idColumn && k !== "created_at");
    const values = keys.map((k) => (patch as any)[k]);
    const setClauses = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");

    const query = `
      UPDATE ${this.tableName}
      SET ${setClauses}, updated_at = NOW()
      WHERE ${this.idColumn} = $1 AND updated_at = '${expectedUpdatedAt}'
      RETURNING *
    `;
    const res = await pool.query(query, [id, ...values]);
    if (res.rowCount === 0) {
      throw new Error("OptimisticConcurrencyError: Failed to update row.");
    }
    return res.rows[0] as T;
  }

  async archive(id: string): Promise<void> {
    await pool.query(
      `UPDATE ${this.tableName} SET archived = TRUE, updated_at = NOW() WHERE ${this.idColumn} = $1`,
      [id]
    );
  }
}
```

### Step 5.3: Automated Sheets-to-Postgres Migration ETL Script
Write a one-time migration script `scripts/migrate-sheets-to-postgres.ts`:
1. Instantiates `GoogleSheetsAdapter`.
2. Reads all rows from `Students`, `Tutors`, `Assignments`, `FollowUps`, `Payments`, `Lookups`, `LocalityLinks`, `Settings`, `MessageTemplates`, and `Meta`.
3. Opens a single PostgreSQL transaction (`BEGIN`).
4. Inserts all records into their respective PostgreSQL tables with parameterized queries.
5. Verifies row counts match between Sheets and Postgres.
6. Commits transaction (`COMMIT`).

### Step 5.4: Switching Adapters
In your repository registry factory (`src/lib/repository/index.ts`):
```typescript
import { GoogleSheetsAdapter } from "../google-sheets/adapter";
import { PostgresAdapter } from "./postgres-adapter";

const USE_POSTGRES = process.env.DATABASE_ADAPTER === "postgres";

export function getStudentRepo(): Repo<Student> {
  return USE_POSTGRES
    ? new PostgresAdapter<Student>("students", "student_id")
    : new GoogleSheetsAdapter<Student>("Students", "student_id");
}
```
Setting `DATABASE_ADAPTER=postgres` and `DATABASE_URL=postgres://...` in `.env` immediately switches storage engines with **zero modifications to frontend components, validation schemas, or API route handlers**.
