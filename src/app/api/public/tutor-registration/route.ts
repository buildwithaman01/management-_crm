import { NextRequest, NextResponse } from "next/server";
import { TutorFormSchema } from "@/lib/validation/tutor-form.schema";
import { TutorSubmissionService } from "@/services/tutor-submission.service";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = TutorFormSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          errors: parsed.error.format(),
          message: "Validation failed. Please correct the highlighted fields.",
        },
        { status: 400 }
      );
    }

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    const service = new TutorSubmissionService();
    const result = await service.registerTutor(parsed.data, clientIp);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to process tutor registration",
      },
      { status: 500 }
    );
  }
}
