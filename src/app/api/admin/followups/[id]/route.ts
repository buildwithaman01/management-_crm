import { NextRequest, NextResponse } from "next/server";
import { updateFollowup, inMemoryFollowupsRepo, isGoogleSheetsConfigured } from "@/lib/followups/followup-store";
import { GoogleSheetsAdapter } from "@/lib/google-sheets/adapter";
import { FollowUp } from "@/types/entities";
import { logActivity } from "@/lib/activity-log/activity-logger";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const followupId = params.id;
    let existing: FollowUp | null = null;

    if (isGoogleSheetsConfigured()) {
      try {
        const adapter = new GoogleSheetsAdapter();
        const list = await adapter.readTab<FollowUp>("FollowUps", {
          skipCache: true,
        });
        existing = list.find((f) => f.followup_id === followupId) || null;
      } catch {
        existing = await inMemoryFollowupsRepo.getById(followupId);
      }
    } else {
      existing = await inMemoryFollowupsRepo.getById(followupId);
    }

    if (!existing) {
      return NextResponse.json(
        { success: false, message: `Follow-up with ID ${followupId} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, followup: existing });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load follow-up" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const followupId = params.id;
    const body = await req.json();

    const patch: Partial<FollowUp> = {};
    if (body.status !== undefined) {
      const upperStatus = String(body.status).toUpperCase();
      if (!["OPEN", "DONE", "CANCELLED"].includes(upperStatus)) {
        return NextResponse.json(
          { success: false, message: "Status must be OPEN, DONE, or CANCELLED" },
          { status: 400 }
        );
      }
      patch.status = upperStatus as "OPEN" | "DONE" | "CANCELLED";
    }

    if (body.due_at !== undefined) {
      patch.due_at = String(body.due_at);
    }

    if (body.description !== undefined) {
      patch.description = String(body.description);
    }

    if (body.followup_type !== undefined) {
      patch.followup_type = String(body.followup_type);
    }

    if (body.priority !== undefined) {
      patch.priority = String(body.priority).toUpperCase() as "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    }

    if (body.completed_at !== undefined) {
      patch.completed_at = String(body.completed_at);
    }

    // Set completed_at timestamp when marked DONE or CANCELLED
    if (patch.status === "DONE" || patch.status === "CANCELLED") {
      if (!patch.completed_at) {
        patch.completed_at = new Date().toISOString();
      }
    } else if (patch.status === "OPEN") {
      patch.completed_at = "";
    }

    const updated = await updateFollowup(followupId, patch);

    const action =
      patch.status === "DONE"
        ? "COMPLETE_FOLLOWUP"
        : patch.status === "CANCELLED"
        ? "CANCEL_FOLLOWUP"
        : "UPDATE_FOLLOWUP";

    // Log Activity adhering to spec Section 6.3 & 20
    await logActivity({
      adminId: body.admin_id || "admin",
      entityType: "FOLLOWUP",
      entityId: followupId,
      action,
      description: `Follow-up ${followupId} updated: status=${updated.status}`,
    });

    return NextResponse.json({ success: true, followup: updated });
  } catch (error: any) {
    const status = error.message?.includes("not found") ? 404 : 500;
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update follow-up" },
      { status }
    );
  }
}
