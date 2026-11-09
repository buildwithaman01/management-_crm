import { ClientConfig, ClientConfigSchema } from "@/types/client";
import { clientConfig as swatiConfig } from "../../clients/swati/config";
import { clientConfig as templateConfig } from "../../clients/_template/config";

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

  const parsed = ClientConfigSchema.safeParse(rawConfig);
  if (!parsed.success) {
    throw new Error(
      `Invalid client configuration for "${clientId}": ${parsed.error.message}`
    );
  }

  return parsed.data;
}

export const currentClient = getClientConfig();
