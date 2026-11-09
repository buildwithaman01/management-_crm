import { ClientConfig, ClientConfigSchema } from "@/types/client";
import { clientConfig as swatiConfig } from "../../clients/swati/config";
import { clientConfig as templateConfig } from "../../clients/_template/config";
import fs from "fs";
import path from "path";

const configs: Record<string, ClientConfig> = {
  swati: swatiConfig,
  _template: templateConfig,
};

export function getClientConfig(): ClientConfig {
  const clientId = process.env.CLIENT_ID || "swati";
  const rawConfig = configs[clientId] || configs["swati"];

  if (!rawConfig) {
    throw new Error(`Client configuration for ID "${clientId}" not found.`);
  }

  // Clone config so dynamic properties don't mutate the static import
  const merged: ClientConfig = JSON.parse(JSON.stringify(rawConfig));

  // Check persistent dynamic settings from data/bureau-branding.json (in non-test environments)
  try {
    if (
      typeof window === "undefined" &&
      typeof process !== "undefined" &&
      process.cwd &&
      !process.env.VITEST &&
      process.env.NODE_ENV !== "test"
    ) {
      const brandingFile = path.join(process.cwd(), "data", "bureau-branding.json");
      if (fs.existsSync(brandingFile)) {
        const rawContent = fs.readFileSync(brandingFile, "utf8");
        const data = JSON.parse(rawContent);

        if (data.bureauName && typeof data.bureauName === "string" && data.bureauName.trim()) {
          merged.businessName = data.bureauName.trim();
          merged.shortName = data.shortName?.trim() || data.bureauName.trim();
        }
        if (data.city && typeof data.city === "string" && data.city.trim()) {
          merged.contact.city = data.city.trim();
        }
        if (data.phone && typeof data.phone === "string" && data.phone.trim()) {
          merged.contact.phone = data.phone.trim();
          merged.contact.whatsapp = data.phone.trim();
        }
        if (data.supportEmail && typeof data.supportEmail === "string" && data.supportEmail.trim()) {
          merged.contact.email = data.supportEmail.trim();
        }
        if (data.currency && typeof data.currency === "string" && data.currency.trim()) {
          merged.locale.currency = data.currency.trim();
        }
        if (data.currencySymbol && typeof data.currencySymbol === "string" && data.currencySymbol.trim()) {
          merged.locale.currencySymbol = data.currencySymbol.trim();
        }
      }
    }
  } catch {
    // Graceful fallback to static configuration on read error
  }

  const parsed = ClientConfigSchema.safeParse(merged);
  if (!parsed.success) {
    return rawConfig;
  }

  return parsed.data;
}

export const currentClient = getClientConfig();
