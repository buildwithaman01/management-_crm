# Production Deployment & Infrastructure Runbook

This guide provides exhaustive, step-by-step instructions for deploying the Tuition Bureau CRM into production. Follow these procedures to configure Google Cloud Service Accounts, Cloudinary private storage, Vercel edge deployment, and production environment variables.

---

## 1. Architecture & Deployment Isolation Model

Each tuition bureau client runs as an **isolated deployment**:
- **Independent Google Sheet:** Raw business records, student requirements, tutor KYC, and financial tracking live in the client's own Google Sheet.
- **Dedicated Cloudinary Bucket/Folder:** Government IDs (Aadhaar copies) and profile photographs are isolated with strict cryptographic access control.
- **Dedicated Environment & Credentials:** Unique administrative password hash, session secrets, and Google service account keys.
- **Immutable Versioning:** Upgrades across multiple client deployments are managed via Git release tags. Never deploy unversioned changes directly to a client's production environment.

---

## 2. Google Cloud Service Account Setup

The application interacts with Google Sheets via the official Google Sheets API v4 using a non-interactive Service Account. Google Drive API is **not** required.

### Step 2.1: Create a Google Cloud Project
1. Log in to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown at the top of the page and select **New Project**.
3. Set the **Project Name** to `tuition-crm-<client-id>` (e.g., `tuition-crm-swati`).
4. Leave Organization unselected (or select your organization if applicable) and click **Create**.
5. Ensure the newly created project is active in the top navigation bar.

### Step 2.2: Enable the Google Sheets API
1. In the Google Cloud Console, navigate to **APIs & Services** > **Library** from the left navigation menu.
2. In the search box, search for `Google Sheets API`.
3. Click on **Google Sheets API** in the results.
4. Click **Enable**. Wait until the API activation is confirmed.

### Step 2.3: Create a Dedicated Service Account
1. Navigate to **APIs & Services** > **Credentials**.
2. Click **+ CREATE CREDENTIALS** at the top of the screen and choose **Service account**.
3. Enter the service account details:
   - **Service account name:** `tuition-crm-sa`
   - **Service account ID:** `tuition-crm-sa` (auto-generates `tuition-crm-sa@<project-id>.iam.gserviceaccount.com`)
   - **Service account description:** `Automated Service Account for Tuition Bureau CRM backend data access.`
4. Click **CREATE AND CONTINUE**.
5. Under **Grant this service account access to project**, you do **not** need to grant broad project roles. Leave the role empty or set to `Viewer`, as authorization is granted at the individual spreadsheet level.
6. Click **CONTINUE**, then click **DONE**.

### Step 2.4: Generate and Download the Private Key
1. On the **Credentials** page, locate your new service account under the **Service Accounts** table.
2. Click the email address of the service account to open its details.
3. Switch to the **Keys** tab.
4. Click **ADD KEY** > **Create new key**.
5. In the modal that appears, select **JSON** and click **CREATE**.
6. A `.json` credential file will be downloaded to your local machine. Keep this file confidential.

Inspect the downloaded JSON file. You will need two values:
- `"client_email"`: e.g., `tuition-crm-sa@tuition-crm-swati.iam.gserviceaccount.com`
- `"private_key"`: e.g., `"-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgk...-----END PRIVATE KEY-----\n"`

---

## 3. Google Sheet Provisioning & Sharing

The Google Sheet can reside in any standard Google account (including the client bureau owner's personal Gmail or Google Workspace).

### Step 3.1: Create the Spreadsheet
1. Open [Google Sheets](https://sheets.google.com) while logged into the client's account.
2. Create a **Blank spreadsheet**.
3. Name the spreadsheet clearly: `[Bureau Name] CRM Data - Production` (e.g., `Swati HTB CRM Data - Production`).

### Step 3.2: Share with the Service Account
1. Click the green **Share** button in the top-right corner.
2. Under "Add people and groups", paste the **`client_email`** extracted in Step 2.4 (e.g., `tuition-crm-sa@tuition-crm-swati.iam.gserviceaccount.com`).
3. Set the permission level to **Editor**.
4. **Uncheck** "Notify people" (Service Accounts do not have mailboxes; attempting to send an email notification may generate a delivery failure).
5. Click **Share** (or **Save**).

### Step 3.3: Extract the Spreadsheet ID
Look at the URL in your browser's address bar:
```
https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0
                                        └──────────────────┬──────────────────┘
                                                    SPREADSHEET_ID
```
Copy the string between `/d/` and `/edit`. This string is your `SPREADSHEET_ID`.

---

## 4. Cloudinary Setup for Private Document Storage

Home tuition bureaus handle sensitive identity documents (Aadhaar cards, degree certificates) and tutor photographs. The system **strictly forbids public file hosting**. All assets are stored using Cloudinary's **Authenticated Delivery Type**.

### Step 4.1: Create a Cloudinary Account
1. Sign up for a free account at [Cloudinary](https://cloudinary.com/).
2. The free tier provides 25 monthly transformation credits (~25 GB storage / monthly bandwidth), which comfortably supports up to 10,000 active tutor registrations.

### Step 4.2: Retrieve Account API Credentials
1. From the Cloudinary Console Dashboard, locate the **Product Environment Credentials**:
   - **Cloud Name:** (e.g., `swati-tuition-bureau`)
   - **API Key:** (e.g., `834927184918234`)
   - **API Secret:** (e.g., `u8Yf7aK9qL0_ZpLm3NxQwErTyUi`)

### Step 4.3: Architecture of Authenticated Uploads
Files are handled through a secure 4-step pipeline:
1. **Client Signature Request:** When a tutor fills out the public registration form or an admin opens the Quick Add modal, the frontend requests an upload signature from `/api/public/upload-signature` (rate-limited by IP, bound to a unique `submission_key`).
2. **Signed Token Generation:** The server validates the request and issues an HMAC signature authorizing an upload only to the folder `tutors/<submission_key>/` with delivery type `authenticated` and allowed extensions (`jpg`, `jpeg`, `png`, `pdf`).
3. **Direct-to-Cloudinary Upload:** The browser uploads the document directly to Cloudinary via REST API, completely bypassing Vercel's 4.5 MB serverless body size limitation.
4. **Server Verification & Storage:** Upon form submission, the server verifies with Cloudinary that each uploaded `public_id` exists, does not exceed 5 MB, and matches the allowed MIME type. The sheet stores **only the `public_id`** (e.g., `tutors/sub_abc123/aadhaar_proof`). Permanent public URLs never exist.

### Step 4.4: Admin Document Viewing (10-Minute Signed URLs)
When an administrator views an Aadhaar card or tutor photo in the dashboard verification panel:
- The frontend requests `/api/admin/files/[publicId]`.
- The server validates the admin's session cookie.
- The server calls Cloudinary's private URL generator to produce a time-limited signed URL valid for **exactly 10 minutes** (`expires_at = now() + 600`).
- The link expires automatically, preventing leaked links from compromising tutor identity documents.

---

## 5. Administrative Authentication Setup

The CRM utilizes a single-tenant owner account model protected by bcrypt password hashing and signed JWT session cookies (`jose`). Passwords are never stored in Google Sheets or source code.

### Step 5.1: Generate Password Hash
On your local machine or build workstation, run:
```bash
npm run hash-password
```
Follow the interactive prompt:
```
Enter administrative password to hash: ******************
Confirm password: ******************

Generated Bcrypt Hash (rounds=10):
$2a$10$w8E0Jm1YgI8qK9tF5vZQzeX7m0V9uL3yN1P5qR7sT9uV3wX5yZ7aB

Add this to your environment variables:
ADMIN_PASSWORD_HASH=$2a$10$w8E0Jm1YgI8qK9tF5vZQzeX7m0V9uL3yN1P5qR7sT9uV3wX5yZ7aB
```

### Step 5.2: Generate Session Secret
Generate a cryptographically secure 32+ character random string:
```bash
openssl rand -base64 32
```
Example output:
`k9Xz7P#mQ2$wL8vN5rT1yU4eI6oP3aS0`

---

## 6. Environment Variables Reference

Configure the following variables in your production environment (e.g., Vercel Project Settings):

| Variable | Required | Description & Constraints |
|---|---|---|
| `CLIENT_ID` | **Yes** | Matches directory name in `clients/` (e.g., `swati`). |
| `NEXT_PUBLIC_APP_URL` | **Yes** | Fully qualified production domain (e.g., `https://crm.swatituitions.com`). Must include protocol. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | **Yes** | Full email address of the GCP Service Account. |
| `GOOGLE_PRIVATE_KEY` | **Yes** | RSA private key from the GCP JSON file. **Must preserve `\n` linebreaks.** |
| `SPREADSHEET_ID` | **Yes** | 44-character alphanumeric Google Sheet identifier. |
| `CLOUDINARY_CLOUD_NAME` | **Yes** | Cloudinary account identifier. |
| `CLOUDINARY_API_KEY` | **Yes** | Cloudinary public integration key. |
| `CLOUDINARY_API_SECRET` | **Yes** | Cloudinary server secret. Never expose to client/browser. |
| `ADMIN_USERNAME` | **Yes** | Administrative username (e.g., `admin` or owner email). |
| `ADMIN_PASSWORD_HASH` | **Yes** | Bcrypt hash generated via `npm run hash-password`. |
| `SESSION_SECRET` | **Yes** | 32+ character random secret used by `jose` for HS256 JWT signing. |
| `UPSTASH_REDIS_REST_URL` | No | Upstash Redis REST URL for distributed write-locking and IP rate-limiting. |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash Redis REST bearer token. |
| `TURNSTILE_SITE_KEY` | No | Cloudflare Turnstile public key for bot verification on public forms. |
| `TURNSTILE_SECRET_KEY` | No | Cloudflare Turnstile server validation secret. |

> [!IMPORTANT]
> **Handling Newlines in `GOOGLE_PRIVATE_KEY`:**
> When pasting `GOOGLE_PRIVATE_KEY` into Vercel's Environment Variables UI, paste the entire string including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`. If entering in a `.env` file, wrap the string in double quotes and ensure literal `\n` characters are preserved. The backend includes a normalization helper that automatically converts literal `\n` escapes to real newlines.

---

## 7. Vercel Deployment Guide

### Step 7.1: Connect Repository to Vercel
1. Log in to [Vercel](https://vercel.com/).
2. Click **Add New...** > **Project**.
3. Import the Git repository hosting your Tuition Bureau CRM code.
4. Configure Project Settings:
   - **Framework Preset:** `Next.js`
   - **Root Directory:** `./`
   - **Build Command:** `next build`
   - **Output Directory:** `.next`
   - **Node.js Version:** `18.x` or `20.x`

### Step 7.2: Populate Environment Variables
1. Expand the **Environment Variables** section.
2. Enter all required keys and values from Section 6 above.
3. Ensure variables are applied to **Production**, **Preview**, and **Development** targets as needed.

### Step 7.3: Deploy
1. Click **Deploy**.
2. Wait for Vercel to complete the build, type-check, and serverless bundle generation.
3. Verify that the build succeeds without ESLint or TypeScript errors.

---

## 8. Post-Deployment Database Initialization

Once the Vercel deployment completes, initialize the Google Sheet schema.

### Step 8.1: Run `npm run setup-sheet`
From your local environment with production `.env` variables loaded (or via a local script pointing to the production spreadsheet):
```bash
SPREADSHEET_ID=your_production_spreadsheet_id \
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_sa_email \
GOOGLE_PRIVATE_KEY="your_sa_private_key" \
npm run setup-sheet
```
This automated script:
1. Connects to the blank spreadsheet.
2. Creates all 11 required tabs (`Students`, `Tutors`, `Assignments`, `FollowUps`, `Payments`, `ActivityLog`, `Lookups`, `LocalityLinks`, `Settings`, `MessageTemplates`, `Meta`).
3. Freezes Row 1 across all tabs.
4. Writes exact lowercase snake_case column headers.
5. Sets `Meta.schema_version = 1`.
6. Seeds starter lookup values (standard classes, CBSE/ICSE boards, school subjects, qualifications, ID types, timings).

### Step 8.2: Run `npm run check-sheet`
Verify schema compliance:
```bash
SPREADSHEET_ID=your_production_spreadsheet_id \
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_sa_email \
GOOGLE_PRIVATE_KEY="your_sa_private_key" \
npm run check-sheet
```
Expected output:
```
[CheckSheet] Verifying 11 tabs...
✔ Students: 28/28 headers match
✔ Tutors: 61/61 headers match
✔ Assignments: 14/14 headers match
✔ FollowUps: 11/11 headers match
✔ Payments: 12/12 headers match
✔ ActivityLog: 8/8 headers match
✔ Lookups: 6/6 headers match
✔ LocalityLinks: 2/2 headers match
✔ Settings: 2/2 headers match
✔ MessageTemplates: 6/6 headers match
✔ Meta: 2/2 headers match
All tabs match schema specification v1.
```

### Step 8.3: Verify Health Endpoint
Visit `https://your-domain.com/api/health` in your browser.
Expected JSON response:
```json
{
  "status": "healthy",
  "timestamp": "2026-11-07T17:00:00.000Z",
  "client": "swati",
  "database": {
    "provider": "google-sheets",
    "spreadsheetId": "1BxiMVs...upms",
    "connected": true,
    "schemaVersion": "1"
  }
}
```

---

## 9. Quotas, Capacity & Commercial Considerations

### Google Sheets API Quotas
- **Per Project Quota:** 300 read requests per minute, 300 write requests per minute.
- **Per User / IP Quota:** 60 requests per minute.
- **CRM Optimization:** The CRM executes whole-tab batch reads (`values.get`), caches results for 30 seconds, and performs single-row appends. A bureau handling 50 active inquiries and 20 tutor applications per day consumes less than **2%** of Google's quota.
- **Scale Ceiling:** Google Sheets handles up to 10,000 rows per tab smoothly. If your bureau reaches 10,000 active students or tutors, follow [ARCHITECTURE.md](ARCHITECTURE.md) to activate the PostgreSQL adapter.

### Cloudinary Quotas
- **Free Plan:** 25 monthly credits (~25 GB managed storage or net bandwidth).
- With client-side image compression (average tutor photo = 250 KB, Aadhaar PDF = 400 KB), 25 GB supports over **35,000 uploaded documents**.
- Unused uploads older than 24 hours can be pruned via **Settings > Data & Safety > Clean up unused uploads**.

### Vercel Serverless Function Limits
- Request timeout: 10 seconds (Hobby), 60 seconds (Pro). All Google Sheets operations complete in under 800ms.
- Maximum payload limit: 4.5 MB. Bypassed entirely by client-side direct uploads to Cloudinary via signed URLs.
