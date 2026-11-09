import { GoogleSheetsAdapter } from "@/lib/google-sheets/adapter";
import { Setting } from "@/types/entities";
import { getClientConfig } from "@/config/client-config";
import {
  DEFAULT_MATCH_WEIGHTS,
  MatchWeights,
} from "@/features/matching/matching-engine";
import {
  TUTOR_FIELD_CATALOG,
  RequiredAt,
} from "@/types/tutor-field-registry";

let inMemorySettingsStore: Record<string, string> = {};

export function getInMemorySettingsStore(): Record<string, string> {
  return { ...inMemorySettingsStore };
}

export function setInMemorySettingsStore(newSettings: Record<string, string>): void {
  inMemorySettingsStore = { ...inMemorySettingsStore, ...newSettings };
}

export function resetInMemorySettingsStore(): void {
  inMemorySettingsStore = {};
}

export interface BureauBranding {
  bureauName: string;
  city: string;
  phone: string;
  supportEmail: string;
  currency: string;
  currencySymbol: string;
  address?: string;
  website?: string;
}

export interface TutorFieldConfig {
  key: string;
  label: string;
  pack: string;
  enabled: boolean;
  requiredAt: RequiredAt;
  isLocked: boolean;
}

export interface SettingsData {
  branding: BureauBranding;
  matchingWeights: MatchWeights & { minScore: number };
  tutorFields: Record<string, TutorFieldConfig>;
  system: {
    retentionMonths: number;
    lastBackupAt: string | null;
    schemaVersion: string;
  };
}

/**
 * Builds the default settings merged with client configuration
 */
export function buildDefaultSettings(): SettingsData {
  const client = getClientConfig();

  const tutorFields: Record<string, TutorFieldConfig> = {};
  for (const field of TUTOR_FIELD_CATALOG) {
    const clientOverride = client.tutorFields?.[field.key];
    tutorFields[field.key] = {
      key: field.key,
      label: field.label,
      pack: field.pack,
      enabled:
        field.isLocked ||
        (clientOverride?.enabled !== undefined
          ? clientOverride.enabled
          : field.defaultEnabled),
      requiredAt:
        (clientOverride?.requiredAt as RequiredAt) || field.defaultRequiredAt,
      isLocked: field.isLocked,
    };
  }

  return {
    branding: {
      bureauName: client.businessName,
      city: client.contact.city,
      phone: client.contact.phone,
      supportEmail: client.contact.email,
      currency: client.locale.currency || "INR",
      currencySymbol: client.locale.currencySymbol || "₹",
      address: "",
      website: "",
    },
    matchingWeights: {
      ...DEFAULT_MATCH_WEIGHTS,
      minScore: 30,
    },
    tutorFields,
    system: {
      retentionMonths: 24,
      lastBackupAt: null,
      schemaVersion: "1",
    },
  };
}

/**
 * Reads raw settings from Google Sheets Settings tab or in-memory fallback
 */
export async function loadRawSettings(): Promise<Record<string, string>> {
  const raw: Record<string, string> = { ...inMemorySettingsStore };

  if (process.env.SPREADSHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    try {
      const adapter = new GoogleSheetsAdapter();
      const rows = await adapter.readTab<Setting>("Settings", { skipCache: true });
      for (const row of rows) {
        if (row.key) {
          raw[row.key] = row.value;
        }
      }
    } catch (err) {
      console.warn("[Settings API] Failed to read from Settings tab:", err);
    }
  }

  return raw;
}
