import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { getGoogleSheetsClient } from "../src/lib/google-sheets/client";
import { TAB_COLUMNS, TabName, SCHEMA_VERSION } from "../src/lib/google-sheets/schema";
import { checkTabHeaders } from "../src/lib/google-sheets/header-mapping";

async function checkSheet() {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!spreadsheetId) {
    console.error("Error: SPREADSHEET_ID environment variable is not set.");
    process.exit(1);
  }

  console.log(`Checking Google Sheet health: ${spreadsheetId}...`);
  const sheets = getGoogleSheetsClient();

  // 1. Check Meta schema_version
  try {
    const metaRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Meta!A2:B",
    });
    const metaRows = metaRes.data.values || [];
    const versionRow = metaRows.find((r) => r[0] === "schema_version");
    const foundVersion = versionRow ? versionRow[1] : null;

    if (foundVersion === SCHEMA_VERSION) {
      console.log(`[PASS] Meta schema_version matches expected version (${SCHEMA_VERSION})`);
    } else {
      console.warn(
        `[WARN] Meta schema_version mismatch! Found: "${foundVersion}", expected: "${SCHEMA_VERSION}"`
      );
    }
  } catch (err) {
    console.error("[FAIL] Could not read Meta tab:", err);
  }

  // 2. Check each tab's headers
  let allHealthy = true;
  const tabNames = Object.keys(TAB_COLUMNS) as TabName[];

  for (const tab of tabNames) {
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${tab}!1:1`,
      });
      const row1 = res.data.values?.[0] || [];
      const result = checkTabHeaders(tab, row1);

      if (result.ok) {
        console.log(`[PASS] Tab "${tab}" is healthy (${row1.length} columns)`);
      } else {
        allHealthy = false;
        console.error(
          `[FAIL] Tab "${tab}" is missing ${result.missingHeaders.length} required columns: ${result.missingHeaders.join(", ")}`
        );
      }
    } catch (err: any) {
      allHealthy = false;
      console.error(`[FAIL] Tab "${tab}" could not be read: ${err.message}`);
    }
  }

  if (allHealthy) {
    console.log("\n All sheet tabs and headers are 100% HEALTHY!");
    process.exit(0);
  } else {
    console.error("\n Sheet health check failed with errors. Run 'npm run setup-sheet' to fix.");
    process.exit(1);
  }
}

checkSheet().catch((err) => {
  console.error("Health check error:", err);
  process.exit(1);
});
