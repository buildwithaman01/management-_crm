import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log/activity-logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { templateName, entityType, entityId, recipientPhone } = body;

    // Log WHATSAPP_OPENED per spec Section 19
    await logActivity({
      adminId: "admin",
      entityType: (entityType || "STUDENT") as any,
      entityId: entityId || "WHATSAPP",
      action: "WHATSAPP_OPENED",
      description: `WhatsApp opened: template "${templateName || "Custom"}" for ${entityType || "record"} ${entityId || ""} (${recipientPhone || ""})`,
    });

    return NextResponse.json({ success: true, message: "Logged WHATSAPP_OPENED" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to log WhatsApp activity" },
      { status: 500 }
    );
  }
}
