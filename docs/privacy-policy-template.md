# Privacy Policy Template (India DPDP Act 2023 Compliant)

> [!NOTE]
> **Implementation Note for Bureau Owners:**
> This document is a comprehensive template tailored to home tuition bureaus operating in India. Replace all placeholder variables formatted as `{{VARIABLE_NAME}}` with your business details before publishing on your website (e.g., at `/privacy`). While this template has been drafted to align with the **Digital Personal Data Protection Act, 2023 (DPDP Act)** and the **Information Technology (SPDI) Rules, 2011**, it is recommended that your legal counsel review the final version for state-specific compliance.

---

**Last Updated:** {{POLICY_EFFECTIVE_DATE}}  
**Version:** {{POLICY_VERSION}} (e.g., `v1.0-2026`)

## 1. Introduction & Scope

Welcome to **{{BUREAU_NAME}}** (operated by **{{BUREAU_LEGAL_ENTITY}}**, referred to as "we", "us", "our", or the "Bureau"). We respect your privacy and are committed to protecting the personal data of parents, students, and tutors who use our home tuition facilitation services, public registration forms, and administrative systems.

This Privacy Policy explains how we collect, process, store, disclose, and protect personal data in compliance with the **Digital Personal Data Protection Act, 2023 (DPDP Act)**, the **Information Technology Act, 2000**, and the **Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011**.

---

## 2. Personal Data We Collect

### 2.1 Students and Parents / Guardians
Because students seeking home tuition are frequently minors (under 18 years of age), **we collect student data exclusively through their lawful parent or legal guardian**:
- **Parent/Guardian Identifiers:** Full name, mobile telephone number, WhatsApp number, email address.
- **Student Details:** Student's full name, academic class/grade, curriculum board (CBSE, ICSE, State Board, etc.), enrolled school name.
- **Educational Requirements:** Specific subjects requiring tutoring, academic challenges, preferred days/timings, monthly fee budget, and home locality.
- **Consent Metadata:** Date and timestamp of consent submission, consent IP address, and privacy policy version accepted.

### 2.2 Prospective and Registered Tutors
To maintain strict child safety standards and verify academic competence, we collect the following data from prospective tutors:
- **Contact & Personal Identifiers:** Full legal name, mobile telephone number, WhatsApp number, email address, gender, date of birth, current residential address, locality, and city.
- **Academic Qualifications:** Highest educational qualification, university/college, degree, course, year of graduation, specializations, and academic certifications.
- **Teaching Profile:** Subjects taught, classes handled, teaching experience in years, mode of teaching (home visit, online, or both), preferred teaching localities, and expected monthly fee.
- **Verification & KYC Documents:**
  - Mandatory clear profile photograph (headshot).
  - Government-issued Identity Proof: Aadhaar Card (scanned copy and 12-digit number), Voter ID, Passport, or Driving Licence.
  - Optional: Scanned educational degree certificates, professional resumes, and previous employment or student references.
- **Administrative Notes:** Operational records, availability status updates, and history of past tuition assignments.

---

## 3. Lawful Basis & Purposes of Data Processing

We process personal data strictly for specified, lawful purposes based on explicit, affirmative consent:

1. **Tuition Facilitation & Matching:** Evaluating student academic requirements against tutor profiles (subjects, classes, localities, fee budgets, and timings) to recommend the most qualified home tutors.
2. **Child Safety & Identity Verification (KYC):** Thoroughly verifying the identity, residential address, and credentials of tutors before introducing them into private homes.
3. **Operational Coordination:** Scheduling trial classes (demos), confirming timings, coordinating tuition commencements, and tracking assignment status.
4. **Administrative Communications:** Delivering service updates, responding to parent inquiries, and processing tutor availability confirmations via phone or WhatsApp.
5. **Legal & Regulatory Compliance:** Maintaining transaction logs, preventing fraudulent or spam submissions, and complying with lawful requests from law enforcement agencies.

We do **not** engage in cross-site tracking, algorithmic profiling for advertising purposes, or commercial resale of personal data.

---

## 4. Special Provisions for Children's Data (DPDP Act Section 9)

We recognize that minors require enhanced privacy protection:
- **Verifiable Parental Consent:** All requests for tuition involving a minor child must be submitted by a parent or legal guardian. The parent must verify that they are authorized to provide information regarding their child.
- **No Harmful Processing:** We do not undertake any processing of children's personal data that is likely to cause any detrimental effect on the well-being of a child.
- **No Tracking or Behavioral Profiling:** We never track student browsing behavior or direct marketing advertisements toward children.

---

## 5. Aadhaar & Government ID Handling Policy

The safety of children in private home environments requires rigorous vetting. In connection with tutor registration:
1. **Voluntary Submission for Identity Verification:** Adult tutors voluntarily upload a copy of their Aadhaar card (or alternative approved government photo ID) solely for identity, age, and address verification.
2. **Masked Aadhaar Permitted:** Tutors are entitled to upload a "Masked Aadhaar" where the first 8 digits are obscured, leaving only the last 4 digits visible.
3. **Encrypted, Private Cloud Storage:** Identification scans are stored in private, cryptographically secured cloud storage. **Permanent public web links to identification documents never exist.**
4. **Strict Confidentiality:** Government ID cards, numbers, and residential house addresses of tutors are **never shared with parents, students, or external third parties**. They are accessible exclusively to authorized administrative personnel for vetting purposes.

---

## 6. Data Storage & Security Safeguards

We implement comprehensive technical and organizational security measures to protect personal data:
- **Access Controls:** Back-office CRM access is restricted to verified administrative staff via cryptographically salted password hashes (bcrypt) and signed, secure session tokens.
- **Private Asset URLs:** Administrative viewing of identity documents and tutor photos utilizes short-lived, time-limited signed URLs (expiring in 10 minutes).
- **Network Encryption:** All communications across public forms and administrative portals are secured using TLS/HTTPS encryption.
- **Tamper-Evident Audit Trails:** All administrative operations (verifications, profile edits, document inspections, and status changes) are logged in an immutable `ActivityLog`.

---

## 7. Data Sharing & Third Parties

We never sell, rent, or trade your personal data. Personal data is disclosed only in the following limited circumstances:
1. **Between Parents and Matched Tutors:**
   - **Tutor Profile to Parent:** Once matched, we share the tutor's photograph, first name, qualifications, and teaching experience with the parent.
   - **Student Requirement to Tutor:** We share the student's class, subjects, general locality, and timing requirements with the tutor. **We do not disclose the parent's phone number or residential street address to the tutor until a trial demo class is officially confirmed by the parent.**
2. **Technical Service Providers:** We engage trusted infrastructure vendors under strict confidentiality obligations:
   - **Google Cloud Platform:** Encrypted tabular database storage (Google Sheets API).
   - **Cloudinary:** Private, authenticated cloud document and image storage.
   - **Vercel Inc.:** Application hosting and edge server execution.
3. **Law Enforcement & Statutory Obligations:** We may disclose personal data if required by applicable Indian law, court order, or formal request from a competent law enforcement authority.

---

## 8. Data Retention & Anonymization

1. **Active Records:** Personal data is retained for the duration of the active tuition relationship and up to **{{RETENTION_MONTHS}} months** (typically 24 months) following the last confirmed activity or communication.
2. **Right to Erasure (Anonymization Protocol):** Upon receiving a valid request for erasure, or upon retention expiration, personal identifying details (names, phone numbers, email addresses, house addresses, Aadhaar numbers, notes, and uploaded identification documents) are permanently deleted from our servers. Statistical non-identifying records (e.g., class level, subjects taught, general locality zone) are preserved in anonymized form for legitimate accounting, tax, and reporting purposes.

---

## 9. Your Rights as a Data Principal

Under the Digital Personal Data Protection Act, 2023, parents, students, and tutors possess the following statutory rights:
- **Right to Access Information:** You have the right to request a summary of the personal data we hold about you and the processing activities undertaken.
- **Right to Correction & Updating:** You have the right to request the correction of inaccurate, misleading, or outdated personal data.
- **Right to Erasure (Right to be Forgotten):** You may request the deletion or anonymization of your personal data, subject to legal retention obligations.
- **Right to Withdraw Consent:** You may withdraw your consent for future processing at any time by contacting our Grievance Officer.
- **Right of Grievance Redressal:** You have the right to seek redressal of grievances regarding the processing of your personal data.

To exercise any of these rights, please review our [Data Subject Requests Runbook](DATA-REQUESTS.md) or contact our designated Grievance Officer below.

---

## 10. Grievance Officer & Contact Information

In accordance with the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023, the details of our designated Data Protection & Grievance Officer are:

- **Name:** {{GRIEVANCE_OFFICER_NAME}}
- **Designation:** Grievance Redressal Officer
- **Bureau Name:** {{BUREAU_NAME}}
- **Physical Address:** {{BUREAU_ADDRESS}}
- **Email:** {{BUREAU_CONTACT_EMAIL}}
- **Telephone / WhatsApp:** {{BUREAU_PHONE}}
- **Working Hours:** Monday to Saturday, 10:00 AM to 6:00 PM IST

We will acknowledge receipt of any privacy grievance or data request within **48 hours** and resolve it within **30 days** of receipt.
