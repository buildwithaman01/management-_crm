# Data Subject Requests & Right to be Forgotten SOP

This Standard Operating Procedure (SOP) defines the mandatory protocol for handling personal data inquiries, Subject Access Requests (SAR), rectification requests, and Right-to-be-Forgotten (Erasure/Anonymization) requests under India's **Digital Personal Data Protection Act, 2023 (DPDP Act)**.

---

## 1. Legal Background & Obligations

Under the DPDP Act (2023) and Section 24 of the Tuition Bureau CRM specification, any parent, student, or tutor whose personal details reside in your CRM has the statutory right to:
1. **Access** a summary of the personal information held about them.
2. **Correct** or update inaccurate personal details.
3. **Withdraw Consent & Request Erasure** (Right to be Forgotten).

As a Data Fiduciary, the bureau must:
- Acknowledge receipt of the request within **48 hours**.
- Verify the identity of the requester to prevent unauthorized data leaks.
- Fulfill the request within **30 calendar days**.
- Maintain an immutable audit record in `ActivityLog`.

---

## 2. Request Handling Workflow

```
┌────────────────────────────────────────────────────────┐
│             Step 1: Receipt & Logging                  │
│       Record incoming email, WhatsApp, or letter       │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│         Step 2: Requester Identity Verification        │
│       Confirm requester owns the phone number/email    │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│             Step 3: Determine Request Type             │
│       (Access, Rectification, or Anonymization)        │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│             Step 4: Execute in Admin Dashboard         │
│       (Export data summary, edit record, or Anonymize) │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│             Step 5: Written Confirmation Handoff       │
│       Notify Data Principal of completed action        │
└────────────────────────────────────────────────────────┘
```

---

## 3. Step 2: Identity Verification Protocol

Before disclosing or altering any record, verify that the person making the request is genuinely the registered parent or tutor:

1. **Phone Callback Verification:** Call the registered mobile number on record (`phone`). Ask the requester to confirm:
   - For Parents: Student's name, registered class, and residential locality.
   - For Tutors: Registered full legal name, date of birth, and last 4 digits of government ID.
2. **Email Verification:** If requested via email, ensure the email matches the `email` stored in the CRM record. Send a verification confirmation link or one-time verification code.
3. **Third-Party Requests:** Do not honor requests made by third parties unless accompanied by a written, signed power of attorney or legal guardianship document (in the case of minors, only the parent or lawful guardian may act).

---

## 4. Handling Access Requests (SAR)

When a parent or tutor asks: *"What information do you hold about me?"*

1. Log in to the Admin Dashboard.
2. Locate the record in **Students** or **Tutors**.
3. Click **View Details**.
4. Generate an extract:
   - Provide a printed or PDF summary containing: Contact details, academic requirements/qualifications, registration date, recorded consent timestamp, and current status.
   - **Exclusion:** Do **not** disclose internal administrative margin notes, internal matching algorithms, or confidential details of other parties (e.g., do not disclose the tutor's Aadhaar scan to a parent, or a parent's address to a tutor).
5. Transmit the summary to the verified requester via email or encrypted WhatsApp.

---

## 5. Handling Rectification Requests

When a parent or tutor updates their contact details, address, or qualifications:

1. Locate the record in the Admin Dashboard.
2. Click **Edit**.
3. Update the specific fields (e.g., new WhatsApp number, updated expected fee).
4. Save the record. The system checks `updated_at` (Optimistic Concurrency) to ensure no conflicting changes, writes the change to Google Sheets, and logs the update in `ActivityLog`.

---

## 6. Handling Erasure: The Anonymization Protocol

When a tutor or parent requests complete deletion: *"Remove my profile, photo, and phone number from your database immediately."*

### Why We Anonymize Instead of Deleting Rows
In Google Sheets, deleting a table row is catastrophic for operational stability:
- It shifts row indices, breaking active references.
- It destroys historical assignment tracking, demo analytics, and commission accounting required for statutory tax reporting under Indian financial laws.
- **The Solution:** The CRM implements a strict **Cryptographic Anonymization Protocol** (Section 24).

### What Happens During Anonymization
When you click **Anonymize Record** on a student or tutor:
1. **PII is Completely Wiped from the Google Sheet:**
   - Names (`student_name`, `parent_name`, `full_name`) are blanked.
   - Phone numbers, WhatsApp numbers, and email addresses are cleared.
   - Detailed residential addresses and house numbers are cleared.
   - Date of birth, school name, college, degree proof IDs, and LinkedIn URLs are cleared.
   - Aadhaar numbers and ID details are permanently erased.
   - Personal admin notes and introduction texts are blanked.
2. **Cloudinary Files are Permanently Destroyed:**
   - The backend issues a Cloudinary `destroy` API call for the tutor's profile photo, Aadhaar scan, and qualification certificates. The files are purged from the cloud storage servers.
3. **Statistical Integrity is Preserved:**
   - The unique ID (`STU-xxx` or `TUT-xxx`) is preserved.
   - Non-identifying statistical fields remain: Academic Class, Subject list, broad City/Locality zone, and final status (`ARCHIVED`).
   - Historical assignments retain the anonymous ID. Your financial reports and historical demand charts remain 100% accurate without leaking personal identity.
4. **Audit Trail Logged:**
   - An entry is written to `ActivityLog`:
     - `action`: `ANONYMIZED`
     - `entity_type`: `STUDENT` or `TUTOR`
     - `entity_id`: `STU-10042`
     - `description`: "Right to be forgotten request fulfilled by admin"
     - `changes`: `{"status": "ANONYMIZED"}` (No personal data is ever recorded in the log).

### Step-by-Step Dashboard Instructions
1. Open the student or tutor profile in the Admin Dashboard.
2. In the top-right action menu, click **More Options (•••)** > **Anonymize Record**.
3. A modal with a red warning will appear:
   ```
   ⚠️ PERMANENT ANONYMIZATION
   This action will permanently erase all names, phone numbers, addresses,
   and government documents for this record, and delete uploaded files from Cloudinary.
   This action cannot be undone.

   Enter reason for anonymization:
   [ Right to be forgotten request - Verified via OTP ]

   Type "CONFIRM" to proceed: [ CONFIRM ]
   ```
4. Enter the required reason and confirmation text.
5. Click **Permanently Anonymize**.
6. A green confirmation toast will appear. The record is now permanently sanitized.

---

## 7. Automated Retention Scanning (Bulk Cleanup)

Under Section 24, the CRM provides an administrative retention manager:

1. Navigate to **Settings** > **Data & Safety**.
2. Locate **Data Retention Management**.
3. The system compares the configured `retention_months` (default: 24 months) against:
   - Inactive students with status `LOST` or `archived = TRUE`.
   - Inactive tutors with status `REJECTED` or `BLACKLISTED`.
4. The screen lists all eligible records exceeding the retention threshold.
5. Click **Bulk Anonymize Expired Records**.
6. All matching records are sanitized in a single batch, and associated Cloudinary assets are deleted.

---

## 8. Template Response Communications

### Template A: Acknowledgment of Request (Sent within 48 hours)
```
Dear [Requester Name],

We have received your personal data request regarding your records with [Bureau Name].

Request Reference: SAR-[YYYYMMDD]-[Record ID]
Date Received: [Date]

In accordance with India's Digital Personal Data Protection Act, 2023, we are verifying your request and will complete processing within 30 calendar days. Our team may contact you on your registered telephone number to verify your identity before releasing or modifying any records.

Sincerely,
Grievance Redressal Officer
[Bureau Name]
[Contact Details]
```

### Template B: Confirmation of Anonymization / Erasure (Sent upon completion)
```
Dear [Requester Name],

We write to confirm that your Right-to-be-Forgotten / Data Erasure request has been fully executed.

Action Taken:
1. All personal identifying information (including your name, telephone numbers, email address, physical address, and government identification numbers) has been permanently removed from our active database.
2. All uploaded identification documents, certificates, and photographs have been permanently deleted from our cloud storage servers.
3. Your record has been rendered permanently anonymous.

Please retain this confirmation for your records.

Sincerely,
Grievance Redressal Officer
[Bureau Name]
[Contact Details]
```
