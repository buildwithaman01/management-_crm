import { NextRequest, NextResponse } from "next/server";
import { GoogleSheetsAdapter } from "@/lib/google-sheets/adapter";
import { localStore } from "@/lib/google-sheets/local-store";
import { Tutor } from "@/types/entities";
import { logActivity } from "@/lib/activity-log/activity-logger";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tutorId = params.id;
    const body = await req.json();
    const { action, reason } = body as {
      action: "VERIFY" | "REJECT" | "BLACKLIST" | "PENDING";
      reason?: string;
    };

    if (!action) {
      return NextResponse.json(
        { success: false, message: "Action is required" },
        { status: 400 }
      );
    }

    const effectiveReason = reason?.trim() || (
      action === "VERIFY"
        ? "Manually verified by admin"
        : action === "REJECT"
        ? "Application rejected by admin"
        : action === "PENDING"
        ? "Reset to pending by admin"
        : "Blacklisted by admin"
    );

    const now = new Date().toISOString();
    const patch: Partial<Tutor> = {
      updated_at: now,
    };

    if (action === "VERIFY") {
      patch.verification_status = "VERIFIED";
      patch.verified_at = now;
      patch.verified_by = "admin";
      patch.rejection_reason = "";
    } else if (action === "REJECT") {
      patch.verification_status = "REJECTED";
      patch.rejection_reason = effectiveReason;
      patch.verified_by = "";
    } else if (action === "BLACKLIST") {
      patch.verification_status = "BLACKLISTED";
      patch.blacklist_reason = effectiveReason;
    } else if (action === "PENDING") {
      patch.verification_status = "PENDING";
      patch.verified_at = "";
      patch.verified_by = "";
      patch.rejection_reason = "";
    }

    // Keep local store in sync immediately for fast local read
    try {
      await localStore.updateRecord<Tutor>("Tutors", "tutor_id", tutorId, patch);
    } catch {
      // Ignore if absent in local store
    }

    if (process.env.SPREADSHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      const adapter = new GoogleSheetsAdapter();
      const tutors = await adapter.readTab<Tutor>("Tutors", {
        skipCache: true,
        includeArchived: true,
      });

      let tutor = tutors.find((t) => t.tutor_id === tutorId);
      if (!tutor) {
        // Fallback: check localStore
        const localTutors = await localStore.readTab<Tutor>("Tutors");
        tutor = localTutors.find((t) => t.tutor_id === tutorId);
        if (!tutor) {
          return NextResponse.json(
            { success: false, message: "Tutor not found" },
            { status: 404 }
          );
        }
      }

      if (action === "VERIFY") {
        const missingDocs: string[] = [];
        if (!tutor.photo_file_id) missingDocs.push("Photo");
        if (!tutor.id_proof_file_id) missingDocs.push("Aadhaar Proof");
        if (!tutor.id_number) missingDocs.push("ID Number");

        if (missingDocs.length > 0) {
          const note = `[Verified by admin with offline verification for: ${missingDocs.join(", ")} on ${now.slice(0, 10)}]`;
          patch.admin_notes = tutor.admin_notes ? `${tutor.admin_notes}\n${note}` : note;
        }
      }

      let updated: Tutor;
      try {
        updated = await adapter.updateRecord<Tutor>(
          "Tutors",
          "tutor_id",
          tutorId,
          patch,
          tutor.updated_at
        );
      } catch (err: any) {
        // If concurrency check failed, re-read and update with fresh timestamp
        try {
          const freshTutors = await adapter.readTab<Tutor>("Tutors", {
            skipCache: true,
            includeArchived: true,
          });
          const fresh = freshTutors.find((t) => t.tutor_id === tutorId);
          if (fresh) {
            updated = await adapter.updateRecord<Tutor>(
              "Tutors",
              "tutor_id",
              tutorId,
              patch,
              fresh.updated_at
            );
          } else {
            throw err;
          }
        } catch {
          // If sheet update fails, update localStore as fallback
          updated = await localStore.updateRecord<Tutor>(
            "Tutors",
            "tutor_id",
            tutorId,
            patch
          );
        }
      }

      // Keep local store in sync with finalized record
      try {
        await localStore.updateRecord<Tutor>("Tutors", "tutor_id", tutorId, updated);
      } catch {
        // Ignore
      }

      // Log activity in background without blocking response
      logActivity({
        adminId: "admin",
        entityType: "TUTOR",
        entityId: tutorId,
        action: `TUTOR_${action}`,
        description: `Tutor verification status set to ${patch.verification_status}. Reason: ${effectiveReason}`,
        changes: {
          verification_status: [tutor.verification_status, patch.verification_status],
        },
        sheetsAdapter: adapter,
      }).catch((logErr) => console.warn("[Verify Log Activity Async]", logErr));

      return NextResponse.json({
        success: true,
        message: `Tutor successfully ${(patch.verification_status || action).toLowerCase()}`,
        tutor: updated,
      });
    }

    // Local-only / Mock fallback
    const updated = await localStore.updateRecord<Tutor>(
      "Tutors",
      "tutor_id",
      tutorId,
      patch
    );

    await logActivity({
      adminId: "admin",
      entityType: "TUTOR",
      entityId: tutorId,
      action: `TUTOR_${action}`,
      description: `Tutor verification status set to ${patch.verification_status}. Reason: ${effectiveReason}`,
      changes: {
        verification_status: ["PENDING", patch.verification_status],
      },
    });

    return NextResponse.json({
      success: true,
      message: `Tutor successfully ${(patch.verification_status || action).toLowerCase()}`,
      tutor: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update verification" },
      { status: 500 }
    );
  }
}
