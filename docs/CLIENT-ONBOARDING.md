# Client Onboarding Checklist & Runbook

This runbook outlines the operational and technical procedure for onboarding a new tuition bureau client. Following this standardized process ensures complete white-label customization, accurate geographic matching rules, verified document workflows, and zero production downtime.

---

## 1. Onboarding Overview & Workflow

```
┌────────────────────────────────────────────────────────┐
│      Phase 1: Discovery & The 3 Core Questions         │
│   (30-min interview to determine required fields)      │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│      Phase 2: Client Config & Asset Scaffolding        │
│   (Copy clients/_template, brand colors, logos)        │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│      Phase 3: Sheet Provisioning & Schema Init         │
│   (Create blank Sheet, share with SA, npm run setup)   │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│      Phase 4: Geographic & Educational Lookups         │
│   (Populate city localities, LocalityLinks, boards)    │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│      Phase 5: Deployment, Testing & Handover           │
│   (Vercel deploy, pre-flight test, admin training)     │
└────────────────────────────────────────────────────────┘
```

---

## 2. Phase 1: Client Discovery & The 3 Core Questions

Do **not** overwhelm the bureau owner with technical jargon or present them with all 50+ available database fields. Instead, ask the **three foundational operational questions** (mandated by Section 8.6):

### Question 1: "What must you know about a tutor before you even consider calling them?"
- **Operational Purpose:** Defines which fields are **strictly required on the public registration form** (`requiredAt: 'submit'`).
- **Standard Answers:** Full Name, Phone Number, Gender, Teaching Mode (Home/Online), Current Locality, Preferred Teaching Localities, Classes Handled, Subjects Handled, Expected Fee.
- **Rule:** If the client does not need an address or college graduation year on the first touch, leave them optional or disabled to maximize registration completion rates.

### Question 2: "What must you physically check before certifying a tutor as 'Verified'?"
- **Operational Purpose:** Defines fields marked as `requiredAt: 'verify'` and KYC rules.
- **Mandatory Requirements:**
  - **Government Photo ID:** Aadhaar Card is compulsory for child safety and home visit integrity.
  - **Profile Photograph:** High-clarity headshot for identity verification and tutor profile sharing with parents.
- **Optional KYC Checks to Ask the Client:**
  - Do you inspect physical degree/graduation certificates? (Default: No / Optional)
  - Do you require written or telephone references from previous employers/students? (Default: Optional)
  - Do you conduct third-party police or background verification? (Default: No)

### Question 3: "What must be on record before a tutor is assigned to a family?"
- **Operational Purpose:** Enforces matching and assignment policies.
- **Standard Policy:** By default, only tutors with `verification_status = 'VERIFIED'` and `availability_status = 'ACTIVE'` can be matched.
- **Verification Policy Options (`match_verification_policy`):**
  - `VERIFIED_ONLY` *(Recommended)*: Only fully vetted tutors with approved Aadhaar and photos appear in Tutor Finder.
  - `INCLUDE_UNDER_REVIEW`: Allows onboarding coordinators to shortlist tutors whose documentation is currently being checked.
  - `INCLUDE_PENDING`: Allows newly registered tutors to be seen. (*Warning: Child safety risk.*)

### Additional Operational Clarifications
1. **Fee Calculation Unit:** Do parents pay per month (`month`) or per hour/class (`hour` / `class`)?
2. **Languages for Public Forms:** English only (`['en']`) or Bilingual English & Hindi (`['en', 'hi']`)?
3. **Turnstile / Bot Protection:** Has the bureau experienced WhatsApp or web spam in the past?

---

## 3. Phase 2: Client Config & Asset Scaffolding

### Step 2.1: Duplicate the Configuration Template
1. Open the project root in your terminal.
2. Duplicate the `clients/_template` directory into `clients/<client_id>` where `<client_id>` is a lowercase, URL-friendly slug:
   ```bash
   cp -r clients/_template clients/swati
   ```

### Step 2.2: Add Branding Assets
Place the client's visual assets in `public/clients/<client_id>/` (or the configured `logoPath`):
- **Logo:** `logo.png` — Recommended size: 400x120px transparent PNG (optimized for white and light backgrounds).
- **Favicon:** `favicon.ico` — 32x32px or 64x64px icon.

### Step 2.3: Configure `clients/<client_id>/config.ts`
Edit `clients/<client_id>/config.ts` with the information collected in Phase 1:

```ts
import type { ClientConfig } from "@/types/client";

export const clientConfig: ClientConfig = {
  id: "swati",
  businessName: "Swati Home Tuition Bureau",
  shortName: "Swati HTB",
  logoPath: "/clients/swati/logo.png",
  faviconPath: "/clients/swati/favicon.ico",
  colors: {
    primary: "#1E3A8A",   // Navy Blue (Main buttons, headers, active states)
    secondary: "#EFF6FF", // Light Blue (Card backgrounds, subtle highlights)
    accent: "#F59E0B",    // Amber (Badges, warnings, matching highlights)
  },
  contact: {
    phone: "+919876543210",
    whatsapp: "+919876543210",
    email: "contact@swatituitions.com",
    city: "Patna",
  },
  locale: {
    countryCode: "+91",
    currency: "INR",
    currencySymbol: "₹",
    feeUnit: "month",
    timezone: "Asia/Kolkata",
    languages: ["en", "hi"],
  },
  features: {
    smartMatching: true,
    assignments: true,
    followups: true,
    payments: false,        // Set true only if bureau tracks billing in CRM
    advancedAnalytics: true,
  },
  tutorFields: {
    // Overrides of default field behaviors based on Phase 1 answers
    highest_qualification: { enabled: true, requiredAt: "submit" },
    specialization: { enabled: true, requiredAt: "optional" },
    university: { enabled: true, requiredAt: "optional" },
    experience_years: { enabled: true, requiredAt: "submit" },
    expected_fee: { enabled: true, requiredAt: "submit" },
    id_proof_file_id: { enabled: true, requiredAt: "verify" },
    photo_file_id: { enabled: true, requiredAt: "verify" },
    degree_proof_file_id: { enabled: false }, // Client does not collect degree scans
    reference_name: { enabled: false },       // Client does not collect references
  },
};
```

---

## 4. Phase 3: Google Sheet Provisioning & Schema Initialization

### Step 3.1: Create & Share the Google Sheet
1. Instruct the client to create a new blank Google Sheet in their Google account (or create it within the agency workspace).
2. Title: `[Client Name] Tuition CRM - Production`.
3. Share the spreadsheet with the Service Account email address:
   `tuition-crm-sa@<project-id>.iam.gserviceaccount.com`
4. Set role to **Editor**.
5. Copy the `SPREADSHEET_ID` from the browser URL bar.

### Step 3.2: Run `setup-sheet`
Initialize the sheet structure from your terminal:
```bash
CLIENT_ID=swati \
SPREADSHEET_ID=1A2B3C4D5E6F7G8H9I0J_your_spreadsheet_id \
GOOGLE_SERVICE_ACCOUNT_EMAIL=tuition-crm-sa@... \
GOOGLE_PRIVATE_KEY="..." \
npm run setup-sheet
```

This provisions the 11 required tabs:
1. `Students` (28 columns)
2. `Tutors` (61 columns)
3. `Assignments` (14 columns)
4. `FollowUps` (11 columns)
5. `Payments` (12 columns)
6. `ActivityLog` (8 columns)
7. `Lookups` (6 columns)
8. `LocalityLinks` (2 columns)
9. `Settings` (2 columns)
10. `MessageTemplates` (6 columns)
11. `Meta` (2 columns with `schema_version = 1`)

---

## 5. Phase 4: Localities & Smart Matching Setup

The smart matching engine's accuracy depends directly on city-specific geography.

### Step 4.1: Populate City Localities in `Lookups`
Open the **Lookups** tab in the client's Google Sheet (or use **Settings > Lists** in the admin dashboard). Add all major residential and commercial localities in the client's target city:

| lookup_type | value | label_en | label_hi | sort_order | active |
|---|---|---|---|---|---|
| locality | BORING_ROAD | Boring Road | बोरिंग रोड | 1 | TRUE |
| locality | KANKARBAGH | Kankarbagh | कंकड़बाग | 2 | TRUE |
| locality | RAJENDRA_NAGAR | Rajendra Nagar | राजेन्द्र नगर | 3 | TRUE |
| locality | BAILEY_ROAD | Bailey Road | बेली रोड | 4 | TRUE |
| locality | PATLIPUTRA | Patliputra Colony | पाटलिपुत्र कॉलोनी | 5 | TRUE |
| locality | ANISABAD | Anisabad | अनीसाबाद | 6 | TRUE |

### Step 4.2: Configure `LocalityLinks` (Adjacent Zones)
The smart matching engine awards:
- **30 points** for exact locality matches.
- **15 points** for adjacent/neighboring localities linked in `LocalityLinks`.
- **0 points** for unconnected localities.

Populate the `LocalityLinks` tab with adjacent pairs (links are treated as two-way):

| locality_a | locality_b |
|---|---|
| BORING_ROAD | PATLIPUTRA |
| BORING_ROAD | BAILEY_ROAD |
| RAJENDRA_NAGAR | KANKARBAGH |
| BAILEY_ROAD | ANISABAD |

*Rule:* Never assume localities are nearby simply because they share a city. Only link localities where a tutor can comfortably travel within 15–20 minutes.

### Step 4.3: Education Boards & Specific Subjects
If the bureau operates in a state with a specific curriculum board (e.g., Bihar State Board, Maharashtra State Board, ICSE), verify that the `board` and `subject` rows exist in `Lookups`. Add any regional languages (e.g., Sanskrit, Urdu, French).

---

## 6. Phase 5: WhatsApp Templates Customization

Open the `MessageTemplates` tab in Google Sheets (or navigate to **Settings > Message Templates** in the admin dashboard). Verify that templates align with the client's business tone:

Available Dynamic Placeholders:
- `{bureau_name}`: Short business name
- `{parent_name}`: Parent/guardian name
- `{student_name}`: Student name
- `{student_class}`: Class level (e.g., Class 10)
- `{subject}`: Subjects requested
- `{locality}`: Student locality
- `{tutor_name}`: Matched tutor full name
- `{tutor_qualification}`: Highest qualification
- `{demo_date}`: Scheduled demo date and time

> [!IMPORTANT]
> **Commission & Contact Protection Policy:**
> By default, `share_parent_phone_with_tutor` is set to `FALSE` in `Settings`. Tutor-facing WhatsApp message templates must **never** include parent contact details or exact residential house numbers until a formal agreement is reached. This protects the bureau's brokerage commission.

---

## 7. Phase 6: Production Deployment & Pre-Flight Testing

### Step 7.1: Set Environment Variables on Vercel
In the client's Vercel project, configure:
```
CLIENT_ID=swati
NEXT_PUBLIC_APP_URL=https://crm.swatituitions.com
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY="..."
SPREADSHEET_ID=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=...
SESSION_SECRET=...
```

### Step 7.2: Run Automated Schema Check
Execute the health check against the live deployment:
```bash
npm run check-sheet
```
Ensure all 11 tabs return green checkmarks.

### Step 7.3: Pre-Flight Verification Checklist
Perform these verification steps on the production deployment:
1. **Public Student Form:** Submit a test student inquiry at `/student-registration`. Confirm record appears in the `Students` tab with `lead_status = 'NEW'`.
2. **Public Tutor Form:** Submit a test tutor registration at `/tutor-registration` including photo and a sample PDF ID proof.
   - Confirm photo and PDF upload successfully directly to Cloudinary.
   - Confirm tutor appears in `Tutors` tab with `verification_status = 'PENDING'`.
3. **Admin Login:** Log in at `/login` with the provisioned credentials. Verify JWT cookie is set.
4. **Verification Panel Test:**
   - Open the test tutor in **Tutors > View**.
   - Confirm the profile photo and Aadhaar PDF open in the side-by-side viewer via signed 10-minute temporary URLs.
   - Approve the tutor (`VERIFIED`).
5. **Smart Matching Test:**
   - Open **Tutor Finder** for the test student.
   - Confirm the test tutor appears with calculated score and breakdown chips.
   - Create a test demo assignment.
6. **Data Privacy & Erasure Test:**
   - Test the Anonymize function on the test student.
   - Confirm personal details are erased from the Sheet and Cloudinary assets are deleted.
7. **Disaster Recovery Backup:**
   - Navigate to **Settings > Data & Safety**.
   - Click **Backup Now**.
   - Confirm a ZIP file containing 11 clean CSV files downloads to your machine.

---

## 8. Phase 7: Client Handover & Training

Provide the bureau owner with the **Handover Package**:

1. **System URLs:**
   - Public Student Form: `https://crm.clientdomain.com/student-registration`
   - Public Tutor Form: `https://crm.clientdomain.com/tutor-registration`
   - Admin Back-Office: `https://crm.clientdomain.com/login`
2. **Access Credentials:** Initial `ADMIN_USERNAME` and temporary password.
3. **Documentation:** Hand over [ADMIN-GUIDE.md](ADMIN-GUIDE.md).
4. **Owner Onboarding Briefing (15 minutes):**
   - Demonstrate the morning routine: checking New Leads and Overdue Follow-ups.
   - Demonstrate how to verify an Aadhaar card using the side-by-side verification panel.
   - Demonstrate running Tutor Finder and opening pre-filled WhatsApp messages.
   - Emphasize the importance of downloading a weekly ZIP backup from **Settings > Data & Safety**.
