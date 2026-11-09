import Link from "next/link";
import { getClientConfig } from "@/config/client-config";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  const config = getClientConfig();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-10 rounded-card border border-gray-200 shadow-sm">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Privacy & Data Protection Policy</h1>
            <p className="text-xs text-gray-500">Effective Date: November 2026</p>
          </div>
        </div>

        <div className="prose prose-sm text-gray-700 space-y-4 leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-gray-900 mt-4 mb-2">1. Who We Are</h2>
            <p>
              This privacy policy applies to <strong>{config.businessName}</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;),
              operating in {config.contact.city}, India. We provide home tuition bureau matchmaking services, connecting parents
              and students with experienced home and online tutors.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mt-4 mb-2">2. What Information We Collect</h2>
            <p><strong>From Parents/Students:</strong> We collect parent name, student name, contact phone number, WhatsApp number, email, student&apos;s grade/class, board, subjects needed, locality, and tuition preferences. We note that student data often belongs to a minor and is provided directly by the parent or legal guardian.</p>
            <p><strong>From Tutors:</strong> We collect full name, phone number, email, address, educational qualifications, teaching experience, preferred localities, fee expectations, a profile photograph, and government ID (Aadhaar/PAN/Voter ID) details and copies for background verification.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mt-4 mb-2">3. Why We Collect It & How It Is Used</h2>
            <p>
              We collect this information strictly for the purpose of matching students with verified tutors, scheduling trial/demo classes, communicating tuition arrangements, and maintaining records. We do not sell, rent, or trade your personal information with third parties.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mt-4 mb-2">4. Identity Verification & Document Safety</h2>
            <p>
              Tutor identity verification documents (including Aadhaar cards and photos) are stored securely with authenticated access control. They are reviewed exclusively by authorized bureau administrative personnel and are never exposed to public search or indexed on search engines.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mt-4 mb-2">5. Data Retention & Right to be Forgotten</h2>
            <p>
              You have the right to request a copy of your personal data or ask us to update, anonymize, or delete your information from our records at any time.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mt-4 mb-2">6. Contact Us</h2>
            <p>
              If you have any questions or data privacy requests, contact our data coordinator at:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
              <li>Business: {config.businessName}</li>
              <li>Location: {config.contact.city}, India</li>
              <li>Phone: {config.contact.phone || "+91 98765 43210"}</li>
              <li>Email: {config.contact.email || "privacy@bureau.com"}</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
