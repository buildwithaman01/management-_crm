# Backup & Disaster Recovery Protocol

This document defines the disaster recovery procedure, backup architecture, and step-by-step restoration protocol for the Tuition Bureau CRM.

---

## 1. Disaster Recovery Objectives & Strategy

- **Recovery Point Objective (RPO):** Maximum 7 days (or immediately prior to major operational updates).
- **Recovery Time Objective (RTO):** Under 20 minutes to provision a new Google Sheet, restore all tabular data, update environment variables, and resume full operations.
- **Dual Safety-Net Model:**
  1. **Primary Operational Defense:** Google Sheets native, continuous **Version History** (cloud-managed revisions).
  2. **Disaster Recovery Backup:** Weekly cryptographic, formula-safe **ZIP/CSV exports** stored offline on administrative machines.

---

## 2. The Backup Protocol

### 2.1 Generating a Full Database Backup (ZIP Export)
1. Log in to the CRM Admin Dashboard.
2. Navigate to **Settings** > **Data & Safety**.
3. Under the **Disaster Recovery & Backups** section, click **Backup Now**.
4. The system executes a full read across all 11 tabs, packages the data into sanitized CSVs, and streams a single compressed `.zip` archive to your browser:
   `tuition-crm-backup-<client_id>-2026-11-07-173000.zip`
5. The CRM automatically updates `last_backup_at` in the `Settings` tab and logs an immutable audit event in `ActivityLog`:
   - `action`: `EXPORT`
   - `description`: `FULL_DATABASE_BACKUP_ZIP`

### 2.2 Inside the Backup ZIP
The downloaded ZIP file contains 11 distinct CSV files corresponding to the database schema:

| File Name | Description | Key Security Considerations |
|---|---|---|
| `Students.csv` | All student requirements, parent contacts, status | Contains student & parent PII |
| `Tutors.csv` | Tutor profiles, qualifications, file IDs | Contains tutor PII & Cloudinary IDs |
| `Assignments.csv` | Tutor-student links, demos, agreed fees | Operational business data |
| `FollowUps.csv` | Scheduled callbacks, reminders, tasks | Operational notes |
| `Payments.csv` | Commission & fee records | Financial records |
| `ActivityLog.csv` | Immutable audit trail of admin actions | Audit logs |
| `Lookups.csv` | Dropdowns: subjects, classes, boards, localities | System vocabulary |
| `LocalityLinks.csv`| Adjacent neighborhood links for matching | Spatial algorithm rules |
| `Settings.csv` | Operational weights, toggles, contact info | Configuration settings |
| `MessageTemplates.csv` | WhatsApp templates & placeholders | Communications config |
| `Meta.csv` | Schema version indicator (`1`) | Version integrity |

### 2.3 Formula Injection Neutralization
To protect administrators opening exported CSV files in Microsoft Excel or Google Sheets, the CRM applies **CSV Formula Injection Sanitization** (Section 11.3). Any cell whose value begins with risky formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) is automatically prefixed with a single quote character (`'`). This prevents malicious spreadsheet command execution while preserving human readability.

### 2.4 Cloudinary Media Storage Decoupling
The ZIP archive contains **only tabular data and Cloudinary `public_id`s**. Physical binary assets (tutor profile photos, Aadhaar scans, qualification PDFs) live securely within your private Cloudinary bucket. If you ever restore a spreadsheet from CSV, all image and document links will immediately continue working because they reference immutable Cloudinary asset keys.

---

## 3. The 7-Day Backup Reminder System

Under Section 25:
- The system stores `last_backup_at` in the `Settings` tab whenever a backup is downloaded.
- If more than 7 days elapse without a backup, a prominent amber reminder banner appears at the top of the **Overview Dashboard**:
  > ⚠️ **Backup Reminder:** Your last full database backup was downloaded 8 days ago. Please visit **Settings > Data & Safety** and download a fresh backup.

---

## 4. Disaster Recovery: Restoring from Scratch (CSV Restore Protocol)

Follow this exact procedure if your production Google Sheet is corrupted, deleted, or compromised:

### Step 4.1: Create a Blank Google Sheet
1. Open [Google Sheets](https://sheets.google.com) using the bureau's Google account.
2. Create a new **Blank spreadsheet**.
3. Name it: `[Bureau Name] CRM Data - Restored [Date]`.

### Step 4.2: Share with the Google Service Account
1. Click the green **Share** button (top right).
2. Enter your `GOOGLE_SERVICE_ACCOUNT_EMAIL` (e.g., `tuition-crm-sa@...iam.gserviceaccount.com`).
3. Set role to **Editor**.
4. Uncheck "Notify people" and click **Share**.

### Step 4.3: Copy the New Spreadsheet ID
From the browser URL bar, copy the 44-character ID between `/d/` and `/edit`:
`https://docs.google.com/spreadsheets/d/`**`1Z2Y3X4W5V6U7T8S9R0Q...`**`/edit`

### Step 4.4: Initialize Schema on the New Sheet
Run `npm run setup-sheet` targeting the new sheet ID to automatically create all 11 tabs, freeze Row 1, and write exact column headers:
```bash
SPREADSHEET_ID="1Z2Y3X4W5V6U7T8S9R0Q..." \
GOOGLE_SERVICE_ACCOUNT_EMAIL="tuition-crm-sa@..." \
GOOGLE_PRIVATE_KEY="..." \
npm run setup-sheet
```

### Step 4.5: Extract and Import the Backup CSVs
1. Extract your latest backup ZIP file into a folder on your computer.
2. For each tab in your new Google Sheet (`Students`, `Tutors`, `Assignments`, `FollowUps`, `Payments`, `ActivityLog`, `Lookups`, `LocalityLinks`, `Settings`, `MessageTemplates`, `Meta`):
   - Switch to that tab in Google Sheets.
   - Click **File** > **Import**.
   - Select the **Upload** tab and upload the corresponding CSV file (e.g., `Students.csv`).
   - In the "Import location" dropdown, select: **Replace data at selected cell** (select cell `A2` so you do not overwrite the frozen headers generated by `setup-sheet`), OR select **Replace current sheet**.
   - In the "Separator type" dropdown, select **Detect automatically** or **Comma**.
   - **CRITICAL SETTING:** **Uncheck** "Convert text to numbers, dates, and formulas".

> [!CAUTION]
> **Preventing Phone Number Corruption in Google Sheets:**
> If Google Sheets automatically converts text to numbers, phone numbers like `+919876543210` will lose their leading `+` sign or be converted into scientific notation (`9.8765E+09`). Always highlight telephone columns (`phone`, `whatsapp`) and ID columns, then select **Format > Number > Plain text**.

### Step 4.6: Update Environment Variables
1. Open your production host settings (e.g., **Vercel Project Settings** > **Environment Variables**).
2. Update the `SPREADSHEET_ID` variable with your new restored sheet ID:
   ```
   SPREADSHEET_ID=1Z2Y3X4W5V6U7T8S9R0Q...
   ```
3. If running locally, update `.env` as well.
4. Redeploy the application on Vercel (or trigger a redeploy from Deployments > Redeploy).

### Step 4.7: Execute Schema & Health Verification
1. Run the automated header check:
   ```bash
   SPREADSHEET_ID="1Z2Y3X4W5V6U7T8S9R0Q..." npm run check-sheet
   ```
   Ensure all 11 tabs display green checkmarks (`11/11 tabs match schema`).
2. Visit `https://your-domain.com/api/health` to confirm database connectivity:
   ```json
   { "status": "healthy", "database": { "connected": true, "schemaVersion": "1" } }
   ```
3. Log in to the Admin Dashboard:
   - Check that the **Overview** metrics reflect the restored student and tutor counts.
   - Open a verified tutor record and verify that the photo and Aadhaar PDF load properly in the 10-minute signed viewer.
   - Test Tutor Finder against an active student requirement.

---

## 5. Secondary Safety Net: Google Sheets Version History

If an administrative assistant or office employee accidentally deletes or overwrites several rows directly in Google Sheets, **a full CSV restore is rarely necessary**. You can roll back specific sheet changes in seconds:

1. Open your Google Sheet in Google Drive.
2. In the top menu, click **File** > **Version history** > **See version history** (or press `Ctrl+Alt+Shift+H` on Windows / `Cmd+Option+Shift+H` on Mac).
3. The right-hand panel displays every historical edit timestamped with the editor's name or Service Account identity.
4. Click on an earlier revision to preview the spreadsheet.
5. Click **Restore this version** at the top of the screen to revert instantly.
