import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getFollowups, createFollowup } from "@/lib/followups/followup-store";
import { logActivity } from "@/lib/activity-log/activity-logger";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const entityType = searchParams.get("entity_type") || searchParams.get("related_type");
    const priority = searchParams.get("priority");
    const overdue = searchParams.get("overdue") === "true";
    const tab = searchParams.get("tab");
    const q = searchParams.get("q") || searchParams.get("search");
    const relatedId = searchParams.get("related_id");

    const followups = await getFollowups({
      status,
      entity_type: entityType,
      priority,
      overdue,
      tab,
      q,
      related_id: relatedId,
    });

    return NextResponse.json({ success: true, followups });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load follow-ups" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      related_type,
      related_id,
      due_at,
      followup_type,
      description,
      priority,
      assigned_admin,
      status,
    } = body;

    // Validation
    if (!related_type || !["STUDENT", "TUTOR", "ASSIGNMENT"].includes(related_type.toUpperCase())) {
      return NextResponse.json(
        { success: false, message: "Valid related_type is required (STUDENT, TUTOR, ASSIGNMENT)" },
        { status: 400 }
      );
    }

    if (!related_id || typeof related_id !== "string" || !related_id.trim()) {
      return NextResponse.json(
        { success: false, message: "related_id is required" },
        { status: 400 }
      );
    }

    if (!due_at || typeof due_at !== "string" || !due_at.trim()) {
      return NextResponse.json(
        { success: false, message: "due_at timestamp is required" },
        { status: 400 }
      );
    }

    if (!description || typeof description !== "string" || !description.trim()) {
      return NextResponse.json(
        { success: false, message: "description is required" },
        { status: 400 }
      );
    }

    const followup = await createFollowup({
      related_type: related_type.toUpperCase() as "STUDENT" | "TUTOR" | "ASSIGNMENT",
      related_id: related_id.trim(),
      due_at: due_at.trim(),
      followup_type: (followup_type || "Call").trim(),
      description: description.trim(),
      priority: priority ? priority.toUpperCase() : "MEDIUM",
      assigned_admin: assigned_admin || "admin",
      status: status || "OPEN",
    });

    // Log Activity adhering to spec Section 6.3 & 20
    await logActivity({
      adminId: assigned_admin || "admin",
      entityType: "FOLLOWUP",
      entityId: followup.followup_id,
      action: "CREATE_FOLLOWUP",
      description: `Follow-up created for ${followup.related_type} (${followup.related_id}): ${followup.description}`,
    });

    return NextResponse.json({ success: true, followup }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create follow-up" },
      { status: 500 }
    );
  }
}
