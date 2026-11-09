import { NextRequest, NextResponse } from "next/server";
import { AnonymizationService } from "@/services/anonymization.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { entityType, id, reason } = body;

    if (!entityType || !id || !reason) {
      return NextResponse.json(
        {
          success: false,
          message: "entityType ('STUDENT' | 'TUTOR'), id, and reason are required",
        },
        { status: 400 }
      );
    }

    const service = new AnonymizationService();
    let result;

    if (entityType === "STUDENT") {
      result = await service.anonymizeStudent(id, reason);
    } else if (entityType === "TUTOR") {
      result = await service.anonymizeTutor(id, reason);
    } else {
      return NextResponse.json(
        { success: false, message: "Invalid entityType" },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to anonymize record" },
      { status: 500 }
    );
  }
}
