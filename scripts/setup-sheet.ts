import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { getGoogleSheetsClient } from "../src/lib/google-sheets/client";
import { TAB_COLUMNS, TabName, STARTER_LOOKUPS, SCHEMA_VERSION } from "../src/lib/google-sheets/schema";
import { recordToRow } from "../src/lib/google-sheets/header-mapping";

async function setupSheet() {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!spreadsheetId) {
    console.error("Error: SPREADSHEET_ID environment variable is not set.");
    process.exit(1);
  }

  console.log(`Setting up Google Sheet: ${spreadsheetId}...`);
  const sheets = getGoogleSheetsClient();

  // 1. Get existing sheet metadata
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheets = meta.data.sheets || [];
  const existingTitles = new Set(
    existingSheets.map((s) => s.properties?.title).filter(Boolean)
  );

  const requests: any[] = [];
  const tabNames = Object.keys(TAB_COLUMNS) as TabName[];

  // 2. Add missing sheets
  for (const tab of tabNames) {
    if (!existingTitles.has(tab)) {
      console.log(`+ Creating tab: ${tab}`);
      requests.push({
        addSheet: {
          properties: {
            title: tab,
            gridProperties: {
              frozenRowCount: 1, // Freeze row 1 (headers)
            },
          },
        },
      });
    }
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }

  // 3. Set headers for each tab
  for (const tab of tabNames) {
    const expectedHeaders = TAB_COLUMNS[tab] as readonly string[];
    console.log(`Configuring headers for tab: ${tab}`);

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab}!1:1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[...expectedHeaders]],
      },
    });
  }

  // 4. Seed Meta tab with schema_version if empty
  console.log("Setting Meta schema_version...");
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Meta!A2:B2`,
    valueInputOption: "RAW",
    requestBody: {
      values: [["schema_version", SCHEMA_VERSION]],
    },
  });

  // 5. Seed Starter Lookups if Lookups tab is empty
  const lookupsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Lookups!A2:A",
  });

  if (!lookupsRes.data.values || lookupsRes.data.values.length === 0) {
    console.log(`Seeding ${STARTER_LOOKUPS.length} starter lookup rows...`);
    const headerMap = new Map<string, number>();
    TAB_COLUMNS.Lookups.forEach((col, idx) => headerMap.set(col, idx));

    const rows = STARTER_LOOKUPS.map((item) => recordToRow(item, headerMap));

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Lookups!A2",
      valueInputOption: "RAW",
      requestBody: {
        values: rows,
      },
    });
  } else {
    console.log("Lookups tab already has data, skipping starter seeding.");
  }

  console.log("Sheet setup completed successfully!");
}

setupSheet().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
