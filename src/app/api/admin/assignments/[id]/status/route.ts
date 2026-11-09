import { NextRequest, NextResponse } from "next/server";
import {
  updateAssignmentStatus,
  UpdateAssignmentStatusInput,
} from "@/features/assignments/assignments-service";
import { AssignmentStatus } from "@/types/vocab";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assignmentId = params.id;
    if (!assignmentId) {
      return NextResponse.json(
        { success: false, message: "Assignment ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const newStatus = (body.status || body.assignment_status) as AssignmentStatus;

    if (!newStatus) {
      return NextResponse.json(
        { success: false, message: "Target status is required" },
        { status: 400 }
      );
    }

    const input: UpdateAssignmentStatusInput = {
      assignmentId,
      newStatus,
      demo_at: body.demo_at,
      demo_status: body.demo_status,
      start_date: body.start_date,
      end_date: body.end_date,
      agreed_fee: body.agreed_fee,
      admin_notes: body.admin_notes,
      expectedUpdatedAt: body.expectedUpdatedAt,
      adminId: body.adminId || "admin",
    };

    const updatedAssignment = await updateAssignmentStatus(input);

    return NextResponse.json({
      success: true,
      assignment: updatedAssignment,
      message: `Assignment status successfully updated to ${newStatus}`,
    });
  } catch (error: any) {
    const msg = error.message || "Failed to update assignment status";
    let statusCode = 500;

    if (msg.includes("not found")) {
      statusCode = 404;
    } else if (msg.includes("Invalid transition") || msg.includes("required")) {
      statusCode = 400;
    } else if (msg.includes("changed by someone else")) {
      statusCode = 409;
    }

    return NextResponse.json(
      { success: false, message: msg },
      { status: statusCode }
    );
  }
}
