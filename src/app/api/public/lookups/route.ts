import { NextResponse } from "next/server";
import { STARTER_LOOKUPS } from "@/lib/google-sheets/schema";
import { GoogleSheetsAdapter } from "@/lib/google-sheets/adapter";
import { Lookup } from "@/types/entities";

export async function GET() {
  try {
    let lookups: Lookup[] = [];
    if (process.env.SPREADSHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      const adapter = new GoogleSheetsAdapter();
      lookups = await adapter.readTab<Lookup>("Lookups");
    }

    if (lookups.length === 0) {
      lookups = STARTER_LOOKUPS as Lookup[];
    }

    // Filter only active lookups
    const active = lookups.filter((l) => l.active !== false);

    // Group by lookup_type
    const grouped: Record<string, { value: string; label_en: string; label_hi?: string }[]> = {};
    for (const item of active) {
      if (!grouped[item.lookup_type]) {
        grouped[item.lookup_type] = [];
      }
      grouped[item.lookup_type].push({
        value: item.value,
        label_en: item.label_en,
        label_hi: item.label_hi,
      });
    }

    return NextResponse.json({ success: true, lookups: grouped });
  } catch (error: any) {
    // Fallback to starter lookups on error
    const grouped: Record<string, { value: string; label_en: string; label_hi?: string }[]> = {};
    for (const item of STARTER_LOOKUPS) {
      if (!grouped[item.lookup_type]) {
        grouped[item.lookup_type] = [];
      }
      grouped[item.lookup_type].push({
        value: item.value,
        label_en: item.label_en,
        label_hi: item.label_hi,
      });
    }
    return NextResponse.json({ success: true, lookups: grouped });
  }
}
