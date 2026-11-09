import { getGoogleSheetsClient } from "./client";
import { TabName } from "./schema";
import { checkTabHeaders, rowToRecord, recordToRow } from "./header-mapping";
import { sheetCache, writeMutex, withRetries } from "./cache-and-lock";
import { localStore } from "./local-store";

export interface ReadTabOptions {
  skipCache?: boolean;
  includeArchived?: boolean;
}

export class GoogleSheetsAdapter {
  private spreadsheetId: string;

  constructor(spreadsheetId?: string) {
    this.spreadsheetId =
      spreadsheetId || process.env.SPREADSHEET_ID || "";
  }

  private hasGoogleConfig(): boolean {
    return Boolean(
      (this.spreadsheetId || process.env.SPREADSHEET_ID) &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    );
  }

  private getSheetId(): string {
    const id = this.spreadsheetId || process.env.SPREADSHEET_ID;
    if (!id) {
      throw new Error(
        "SPREADSHEET_ID environment variable is missing."
      );
    }
    return id;
  }

  /**
   * Reads all records from a tab with header validation and 30s caching
   */
  async readTab<T extends Record<string, any>>(
    tabName: TabName,
    options: ReadTabOptions = {}
  ): Promise<T[]> {
    if (!this.hasGoogleConfig()) {
      return localStore.readTab<T>(tabName, options);
    }

    const spreadsheetId = this.getSheetId();
    const cacheKey = `tab:${spreadsheetId}:${tabName}`;

    if (!options.skipCache) {
      const cached = sheetCache.get<T[]>(cacheKey);
      if (cached) {
        return options.includeArchived
          ? cached
          : cached.filter((item) => !item.archived);
      }
    }

    const sheets = getGoogleSheetsClient();

    const response = await withRetries(async () =>
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${tabName}!A1:ZZ`,
        valueRenderOption: "UNFORMATTED_VALUE",
      })
    );

    const rows = response.data.values || [];
    if (rows.length === 0) {
      return [];
    }

    const headerRow = rows[0] || [];
    const headerCheck = checkTabHeaders(tabName, headerRow);
    if (!headerCheck.ok) {
      throw new Error(
        `Header health check failed for tab "${tabName}". Missing required columns: ${headerCheck.missingHeaders.join(
          ", "
        )}`
      );
    }

    const records: T[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      const record = rowToRecord(row, headerCheck.headerIndexMap, tabName) as T;
      records.push(record);
    }

    sheetCache.set(cacheKey, records, 30);

    return options.includeArchived
      ? records
      : records.filter((item) => !item.archived);
  }

  /**
   * Appends a new record to the tab using RAW input option and write lock
   */
  async appendRecord<T extends Record<string, any>>(
    tabName: TabName,
    record: T
  ): Promise<T> {
    if (!this.hasGoogleConfig()) {
      return localStore.appendRecord(tabName, record);
    }

    const spreadsheetId = this.getSheetId();
    const releaseLock = await writeMutex.acquire(spreadsheetId);

    try {
      const sheets = getGoogleSheetsClient();

      // Read header row directly to construct exact row
      const headerResponse = await withRetries(async () =>
        sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${tabName}!1:1`,
          valueRenderOption: "UNFORMATTED_VALUE",
        })
      );

      const headerRow = headerResponse.data.values?.[0] || [];
      const headerCheck = checkTabHeaders(tabName, headerRow);
      if (!headerCheck.ok) {
        throw new Error(
          `Cannot write to tab "${tabName}". Missing columns: ${headerCheck.missingHeaders.join(
            ", "
          )}`
        );
      }

      const rowValues = recordToRow(record, headerCheck.headerIndexMap);

      await withRetries(async () =>
        sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${tabName}!A1`,
          valueInputOption: "RAW",
          insertDataOption: "INSERT_ROWS",
          requestBody: {
            values: [rowValues],
          },
        })
      );

      // Invalidate cache for this tab
      sheetCache.invalidate(`tab:${spreadsheetId}:${tabName}`);

      return record;
    } finally {
      releaseLock();
    }
  }

  /**
   * Updates an existing record by finding its row by ID with optimistic concurrency check
   */
  async updateRecord<T extends Record<string, any>>(
    tabName: TabName,
    idKey: string,
    idValue: string,
    patch: Partial<T>,
    expectedUpdatedAt: string
  ): Promise<T> {
    const spreadsheetId = this.getSheetId();
    const releaseLock = await writeMutex.acquire(spreadsheetId);

    try {
      const sheets = getGoogleSheetsClient();

      // Read fresh rows to locate row number and check concurrency
      const response = await withRetries(async () =>
        sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${tabName}!A1:ZZ`,
          valueRenderOption: "UNFORMATTED_VALUE",
        })
      );

      const rows = response.data.values || [];
      if (rows.length === 0) {
        throw new Error(`Tab "${tabName}" has no data.`);
      }

      const headerRow = rows[0] || [];
      const headerCheck = checkTabHeaders(tabName, headerRow);
      if (!headerCheck.ok) {
        throw new Error(
          `Cannot update tab "${tabName}". Missing columns: ${headerCheck.missingHeaders.join(
            ", "
          )}`
        );
      }

      const idColIndex = headerCheck.headerIndexMap.get(idKey.toLowerCase());
      if (idColIndex === undefined) {
        throw new Error(`ID column "${idKey}" not found in tab "${tabName}".`);
      }

      // Find row index (1-based for Sheets API, row 1 is header)
      let targetRowIndex = -1;
      let existingRecord: T | null = null;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row && String(row[idColIndex]) === idValue) {
          targetRowIndex = i + 1; // 1-based row index
          existingRecord = rowToRecord(
            row,
            headerCheck.headerIndexMap,
            tabName
          ) as T;
          break;
        }
      }

      if (targetRowIndex === -1 || !existingRecord) {
        throw new Error(`Record with ID "${idValue}" not found in "${tabName}".`);
      }

      // Optimistic concurrency check (Section 6.1)
      if (existingRecord.updated_at && existingRecord.updated_at !== expectedUpdatedAt) {
        throw new Error(
          "This record was changed by someone else. Reload and try again."
        );
      }

      const now = new Date().toISOString();
      const updatedRecord = {
        ...existingRecord,
        ...patch,
        [idKey]: idValue, // ID is immutable
        updated_at: now,
      };

      const updatedRowValues = recordToRow(
        updatedRecord,
        headerCheck.headerIndexMap
      );

      await withRetries(async () =>
        sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${tabName}!A${targetRowIndex}`,
          valueInputOption: "RAW",
          requestBody: {
            values: [updatedRowValues],
          },
        })
      );

      // Invalidate cache
      sheetCache.invalidate(`tab:${spreadsheetId}:${tabName}`);

      return updatedRecord;
    } finally {
      releaseLock();
    }
  }

  /**
   * Archive a record by ID
   */
  async archiveRecord(
    tabName: TabName,
    idKey: string,
    idValue: string
  ): Promise<void> {
    const spreadsheetId = this.getSheetId();
    const releaseLock = await writeMutex.acquire(spreadsheetId);

    try {
      const sheets = getGoogleSheetsClient();
      const response = await withRetries(async () =>
        sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${tabName}!A1:ZZ`,
          valueRenderOption: "UNFORMATTED_VALUE",
        })
      );

      const rows = response.data.values || [];
      const headerRow = rows[0] || [];
      const headerCheck = checkTabHeaders(tabName, headerRow);
      if (!headerCheck.ok) {
        throw new Error(`Cannot archive: missing columns.`);
      }

      const idColIndex = headerCheck.headerIndexMap.get(idKey.toLowerCase());
      if (idColIndex === undefined) throw new Error("ID column not found.");

      let targetRowIndex = -1;
      let existingRecord: any = null;

      for (let i = 1; i < rows.length; i++) {
        if (rows[i] && String(rows[i][idColIndex]) === idValue) {
          targetRowIndex = i + 1;
          existingRecord = rowToRecord(rows[i], headerCheck.headerIndexMap, tabName);
          break;
        }
      }

      if (targetRowIndex === -1 || !existingRecord) {
        throw new Error(`Record ${idValue} not found.`);
      }

      const now = new Date().toISOString();
      existingRecord.archived = true;
      existingRecord.updated_at = now;

      const updatedRow = recordToRow(existingRecord, headerCheck.headerIndexMap);

      await withRetries(async () =>
        sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${tabName}!A${targetRowIndex}`,
          valueInputOption: "RAW",
          requestBody: {
            values: [updatedRow],
          },
        })
      );

      sheetCache.invalidate(`tab:${spreadsheetId}:${tabName}`);
    } finally {
      releaseLock();
    }
  }

  /**
   * Delete a record by ID (or archive if Google config active)
   */
  async deleteRecord(
    tabName: TabName,
    idKey: string,
    idValue: string
  ): Promise<boolean> {
    if (!this.hasGoogleConfig()) {
      return localStore.deleteRecord(tabName, idKey, idValue);
    }
    await this.archiveRecord(tabName, idKey, idValue);
    return true;
  }
}
