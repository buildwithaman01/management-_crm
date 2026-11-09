import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";
import { GoogleSheetsAdapter } from "@/lib/google-sheets/adapter";
import { MatchWeights } from "@/features/matching/matching-engine";
import {
  TUTOR_FIELD_CATALOG,
  RequiredAt,
} from "@/types/tutor-field-registry";
import { logActivity } from "@/lib/activity-log/activity-logger";
import {
  buildDefaultSettings,
  loadRawSettings,
  setInMemorySettingsStore,
  TutorFieldConfig,
} from "@/lib/settings/settings-service";

export async function GET() {
  try {
    const raw = await loadRawSettings();
    const defaults = buildDefaultSettings();

    // Merge branding
    if (raw["bureau_name"]) defaults.branding.bureauName = raw["bureau_name"];
    if (raw["city"]) defaults.branding.city = raw["city"];
    if (raw["phone"]) defaults.branding.phone = raw["phone"];
    if (raw["support_email"]) defaults.branding.supportEmail = raw["support_email"];
    if (raw["currency"]) defaults.branding.currency = raw["currency"];
    if (raw["currency_symbol"]) defaults.branding.currencySymbol = raw["currency_symbol"];
    if (raw["address"]) defaults.branding.address = raw["address"];
    if (raw["website"]) defaults.branding.website = raw["website"];

    // Merge matching weights
    if (raw["match_weights"]) {
      try {
        const parsed = JSON.parse(raw["match_weights"]);
        defaults.matchingWeights = {
          ...defaults.matchingWeights,
          ...parsed,
        };
      } catch {
        // Fallback to defaults
      }
    }

    // Merge individual weights if stored separately
    const weightKeys: (keyof MatchWeights)[] = [
      "locality",
      "subject",
      "class",
      "board",
      "fee",
      "timing",
      "experience",
      "freshness",
    ];
    for (const wk of weightKeys) {
      if (raw[`weight_${wk}`]) {
        const num = Number(raw[`weight_${wk}`]);
        if (!isNaN(num)) {
          defaults.matchingWeights[wk] = num;
        }
      }
    }
    if (raw["match_min_score"]) {
      const ms = Number(raw["match_min_score"]);
      if (!isNaN(ms)) defaults.matchingWeights.minScore = ms;
    }

    // Merge tutor field toggles
    if (raw["tutor_fields"]) {
      try {
        const parsedTutorFields = JSON.parse(raw["tutor_fields"]);
        for (const [key, val] of Object.entries(parsedTutorFields)) {
          if (defaults.tutorFields[key]) {
            const v = val as Partial<TutorFieldConfig>;
            if (typeof v.enabled === "boolean" && !defaults.tutorFields[key].isLocked) {
              defaults.tutorFields[key].enabled = v.enabled;
            }
            if (v.requiredAt) {
              defaults.tutorFields[key].requiredAt = v.requiredAt;
            }
          }
        }
      } catch {
        // Ignore JSON parse error
      }
    }

    // Merge system info
    if (raw["retention_months"]) {
      const rm = parseInt(raw["retention_months"], 10);
      if (!isNaN(rm)) defaults.system.retentionMonths = rm;
    }
    if (raw["last_backup_at"]) {
      defaults.system.lastBackupAt = raw["last_backup_at"];
    }

    return NextResponse.json({
      success: true,
      settings: defaults,
      raw,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load settings" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { branding, matchingWeights, tutorFields, system } = body;

    const updatesToStore: Record<string, string> = {};

    // 1. Validate and prepare Branding updates
    if (branding) {
      if (typeof branding.bureauName === "string") {
        if (!branding.bureauName.trim()) {
          return NextResponse.json(
            { success: false, message: "Bureau name cannot be empty" },
            { status: 400 }
          );
        }
        updatesToStore["bureau_name"] = branding.bureauName.trim();
      }
      if (typeof branding.city === "string") updatesToStore["city"] = branding.city.trim();
      if (typeof branding.phone === "string") updatesToStore["phone"] = branding.phone.trim();
      if (typeof branding.supportEmail === "string") updatesToStore["support_email"] = branding.supportEmail.trim();
      if (typeof branding.currency === "string") updatesToStore["currency"] = branding.currency.trim();
      if (typeof branding.currencySymbol === "string") updatesToStore["currency_symbol"] = branding.currencySymbol.trim();
      if (typeof branding.address === "string") updatesToStore["address"] = branding.address.trim();
      if (typeof branding.website === "string") updatesToStore["website"] = branding.website.trim();
    }

    // 2. Validate and prepare Matching Weights
    if (matchingWeights) {
      const weightKeys: (keyof MatchWeights)[] = [
        "locality",
        "subject",
        "class",
        "board",
        "fee",
        "timing",
        "experience",
        "freshness",
      ];
      for (const k of weightKeys) {
        if (matchingWeights[k] !== undefined) {
          const val = Number(matchingWeights[k]);
          if (isNaN(val) || val < 0 || val > 100) {
            return NextResponse.json(
              {
                success: false,
                message: `Weight "${k}" must be a number between 0 and 100`,
              },
              { status: 400 }
            );
          }
          updatesToStore[`weight_${k}`] = String(val);
        }
      }
      if (matchingWeights.minScore !== undefined) {
        const ms = Number(matchingWeights.minScore);
        if (isNaN(ms) || ms < 0 || ms > 100) {
          return NextResponse.json(
            { success: false, message: "minScore must be a number between 0 and 100" },
            { status: 400 }
          );
        }
        updatesToStore["match_min_score"] = String(ms);
      }
      updatesToStore["match_weights"] = JSON.stringify(matchingWeights);
    }

    // 3. Validate and prepare Tutor Fields
    if (tutorFields && typeof tutorFields === "object") {
      const sanitizedFields: Record<string, { enabled: boolean; requiredAt: RequiredAt }> = {};
      const lockedCatalogKeys = new Set(
        TUTOR_FIELD_CATALOG.filter((f) => f.isLocked).map((f) => f.key)
      );

      for (const [key, val] of Object.entries(tutorFields)) {
        const item = val as any;
        const isLocked = lockedCatalogKeys.has(key);
        const enabled = isLocked ? true : Boolean(item.enabled);
        const validRequiredAt: RequiredAt[] = ["submit", "verify", "optional"];
        const requiredAt = validRequiredAt.includes(item.requiredAt)
          ? item.requiredAt
          : "optional";

        sanitizedFields[key] = { enabled, requiredAt };
      }
      updatesToStore["tutor_fields"] = JSON.stringify(sanitizedFields);
    }

    // 4. System settings
    if (system?.retentionMonths !== undefined) {
      const rm = parseInt(system.retentionMonths, 10);
      if (isNaN(rm) || rm < 1) {
        return NextResponse.json(
          { success: false, message: "Retention months must be a positive integer" },
          { status: 400 }
        );
      }
      updatesToStore["retention_months"] = String(rm);
    }

    // Store in-memory
    setInMemorySettingsStore(updatesToStore);

    // Persist branding to data/bureau-branding.json for instant full white-label syncing (skip in test mode)
    const isTest = Boolean(process.env.VITEST || process.env.NODE_ENV === "test");
    if (branding && !isTest) {
      try {
        const dataDir = path.join(process.cwd(), "data");
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        const brandingPath = path.join(dataDir, "bureau-branding.json");
        let existingBranding: Record<string, any> = {};
        if (fs.existsSync(brandingPath)) {
          try {
            existingBranding = JSON.parse(fs.readFileSync(brandingPath, "utf8"));
          } catch {
            existingBranding = {};
          }
        }
        const mergedBranding = {
          ...existingBranding,
          bureauName: branding.bureauName?.trim() || existingBranding.bureauName || "",
          shortName: branding.bureauName?.trim() || existingBranding.shortName || "",
          city: branding.city?.trim() || existingBranding.city || "",
          phone: branding.phone?.trim() || existingBranding.phone || "",
          supportEmail: branding.supportEmail?.trim() || existingBranding.supportEmail || "",
          currency: branding.currency?.trim() || existingBranding.currency || "INR",
          currencySymbol: branding.currencySymbol?.trim() || existingBranding.currencySymbol || "₹",
          address: branding.address?.trim() || existingBranding.address || "",
          website: branding.website?.trim() || existingBranding.website || "",
        };
        fs.writeFileSync(brandingPath, JSON.stringify(mergedBranding, null, 2), "utf8");

        // Also sync clients/swati/config.ts so hot-reloads and static references always match
        try {
          const swatiConfigPath = path.join(process.cwd(), "clients", "swati", "config.ts");
          if (fs.existsSync(swatiConfigPath)) {
            let content = fs.readFileSync(swatiConfigPath, "utf8");
            if (mergedBranding.bureauName) {
              content = content.replace(/businessName:\s*"[^"]*"/, `businessName: "${mergedBranding.bureauName}"`);
              content = content.replace(/shortName:\s*"[^"]*"/, `shortName: "${mergedBranding.shortName}"`);
            }
            if (mergedBranding.city) {
              content = content.replace(/city:\s*"[^"]*"/, `city: "${mergedBranding.city}"`);
            }
            if (mergedBranding.phone) {
              content = content.replace(/phone:\s*"[^"]*"/, `phone: "${mergedBranding.phone}"`);
              content = content.replace(/whatsapp:\s*"[^"]*"/, `whatsapp: "${mergedBranding.phone}"`);
            }
            if (mergedBranding.supportEmail) {
              content = content.replace(/email:\s*"[^"]*"/, `email: "${mergedBranding.supportEmail}"`);
            }
            if (mergedBranding.currency) {
              content = content.replace(/currency:\s*"[^"]*"/, `currency: "${mergedBranding.currency}"`);
            }
            if (mergedBranding.currencySymbol) {
              content = content.replace(/currencySymbol:\s*"[^"]*"/, `currencySymbol: "${mergedBranding.currencySymbol}"`);
            }
            fs.writeFileSync(swatiConfigPath, content, "utf8");
          }
        } catch (swatiErr) {
          console.warn("[Settings API] Warning syncing clients/swati/config.ts:", swatiErr);
        }

        // Revalidate Next.js cache so layout, headers, footers and pages update immediately
        try {
          revalidatePath("/", "layout");
          revalidatePath("/privacy");
          revalidatePath("/");
        } catch {
          // Ignore in non-request contexts
        }
      } catch (fileErr) {
        console.warn("[Settings API] Warning saving bureau-branding.json:", fileErr);
      }
    }

    // Save to Google Sheets if configured
    if (process.env.SPREADSHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      try {
        const adapter = new GoogleSheetsAdapter();
        for (const [key, value] of Object.entries(updatesToStore)) {
          await adapter.appendRecord("Settings", { key, value });
        }
      } catch (err) {
        console.warn("[Settings API] Warning saving to Google Sheets:", err);
      }
    }

    // Log Activity (Section 23: "Every save shows success/error toast and writes ActivityLog")
    await logActivity({
      adminId: "admin",
      entityType: "SETTINGS",
      entityId: "SYSTEM_SETTINGS",
      action: "UPDATE_SETTINGS",
      description: "Admin updated bureau branding, matching weights, or tutor fields",
      changes: {
        keys_updated: [Object.keys(updatesToStore), Object.keys(updatesToStore)],
      },
    });

    return NextResponse.json({
      success: true,
      message: "Settings saved successfully",
      savedKeys: Object.keys(updatesToStore),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to save settings" },
      { status: 500 }
    );
  }
}
