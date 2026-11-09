import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { GoogleSheetsAdapter } from "@/lib/google-sheets/adapter";
import { Tutor } from "@/types/entities";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get("archived") === "true";

    const adapter = new GoogleSheetsAdapter();
    const tutors = await adapter.readTab<Tutor>("Tutors", {
      includeArchived,
      skipCache: true,
    });

    return NextResponse.json({ success: true, tutors });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load tutors" },
      { status: 500 }
    );
  }
}
