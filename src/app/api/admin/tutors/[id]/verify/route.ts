import { NextRequest, NextResponse } from "next/server";
import { GoogleSheetsAdapter } from "@/lib/google-sheets/adapter";
import { Tutor } from "@/types/entities";
import { logActivity } from "@/lib/activity-log/activity-logger";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tutorId = params.id;
    const body = await req.json();
    const { action, reason } = body as {
      action: "VERIFY" | "REJECT" | "BLACKLIST";
      reason?: string;
    };

    if (!action) {
      return NextResponse.json(
        { success: false, message: "Action is required" },
        { status: 400 }
      );
    }

    if ((action === "REJECT" || action === "BLACKLIST") && !reason?.trim()) {
      return NextResponse.json(
        { success: false, message: `Reason is required for ${action}` },
        { status: 400 }
      );
    }

    if (process.env.SPREADSHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      const adapter = new GoogleSheetsAdapter();
      const tutors = await adapter.readTab<Tutor>("Tutors", {
        skipCache: true,
        includeArchived: true,
      });

      const tutor = tutors.find((t) => t.tutor_id === tutorId);
      if (!tutor) {
        return NextResponse.json(
          { success: false, message: "Tutor not found" },
          { status: 404 }
        );
      }

      const patch: Partial<Tutor> = {};
      const now = new Date().toISOString();

      if (action === "VERIFY") {
        // Verification checks (Section 15.2): Check mandatory verification documents
        const missingFields: string[] = [];
        if (!tutor.full_name) missingFields.push("Full Name");
        if (!tutor.phone) missingFields.push("Phone");
        if (!tutor.photo_file_id) missingFields.push("Profile Photo");
        if (!tutor.id_number) missingFields.push("ID / Aadhaar Number");
        if (!tutor.id_proof_file_id) missingFields.push("Aadhaar / ID Proof Document");

        if (missingFields.length > 0) {
          return NextResponse.json(
            {
              success: false,
              message: `Cannot verify tutor. Missing mandatory verification fields: ${missingFields.join(", ")}`,
            },
            { status: 400 }
          );
        }

        patch.verification_status = "VERIFIED";
        patch.verified_at = now;
        patch.verified_by = "admin";
      } else if (action === "REJECT") {
        patch.verification_status = "REJECTED";
        patch.rejection_reason = reason;
      } else if (action === "BLACKLIST") {
        patch.verification_status = "BLACKLISTED";
        patch.blacklist_reason = reason;
      }

      const updated = await adapter.updateRecord<Tutor>(
        "Tutors",
        "tutor_id",
        tutorId,
        patch,
        tutor.updated_at
      );

      await logActivity({
        adminId: "admin",
        entityType: "TUTOR",
        entityId: tutorId,
        action: `TUTOR_${action}`,
        description: `Tutor verification updated to ${patch.verification_status}. Reason: ${reason || "Verified credentials verified"}`,
        changes: {
          verification_status: [tutor.verification_status, patch.verification_status],
        },
        sheetsAdapter: adapter,
      });

      return NextResponse.json({ success: true, tutor: updated });
    }

    return NextResponse.json({ success: true, message: "Verified in mock mode" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update verification" },
      { status: 500 }
    );
  }
}
