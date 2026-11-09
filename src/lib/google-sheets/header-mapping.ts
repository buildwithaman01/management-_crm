import { TAB_COLUMNS, TabName } from "./schema";

export interface HeaderCheckResult {
  ok: boolean;
  tabName: string;
  missingHeaders: string[];
  extraHeaders: string[];
  headerIndexMap: Map<string, number>;
}

/**
 * Validates header row against expected tab definition (Section 6.1).
 * Ignores casing differences and leading/trailing whitespace.
 */
export function checkTabHeaders(
  tabName: TabName,
  actualRow1: (string | undefined | null)[]
): HeaderCheckResult {
  const expected = TAB_COLUMNS[tabName] as readonly string[];
  const headerIndexMap = new Map<string, number>();

  actualRow1.forEach((header, index) => {
    if (typeof header === "string" && header.trim().length > 0) {
      headerIndexMap.set(header.trim().toLowerCase(), index);
    }
  });

  const missingHeaders: string[] = [];
  expected.forEach((col) => {
    if (!headerIndexMap.has(col.toLowerCase())) {
      missingHeaders.push(col);
    }
  });

  const extraHeaders: string[] = [];
  headerIndexMap.forEach((_, header) => {
    if (!expected.includes(header as any)) {
      extraHeaders.push(header);
    }
  });

  return {
    ok: missingHeaders.length === 0,
    tabName,
    missingHeaders,
    extraHeaders,
    headerIndexMap,
  };
}

/**
 * Maps a row array of values into a typed key-value record based on header map
 */
export function rowToRecord(
  rowValues: (string | number | boolean | null | undefined)[],
  headerIndexMap: Map<string, number>,
  tabName: TabName
): Record<string, any> {
  const expected = TAB_COLUMNS[tabName] as readonly string[];
  const record: Record<string, any> = {};

  expected.forEach((col) => {
    const colIndex = headerIndexMap.get(col.toLowerCase());
    if (colIndex !== undefined && colIndex < rowValues.length) {
      const val = rowValues[colIndex];
      if (val === undefined || val === null || val === "") {
        record[col] = "";
      } else if (val === "TRUE") {
        record[col] = true;
      } else if (val === "FALSE") {
        record[col] = false;
      } else {
        record[col] = String(val);
      }
    } else {
      record[col] = "";
    }
  });

  // Ensure boolean archived
  if (record.archived === "TRUE" || record.archived === true) {
    record.archived = true;
  } else {
    record.archived = false;
  }

  return record;
}

/**
 * Maps a record into a row array of values matching the sheet's actual header layout
 */
export function recordToRow(
  record: Record<string, any>,
  headerIndexMap: Map<string, number>
): string[] {
  let maxIndex = -1;
  headerIndexMap.forEach((idx) => {
    if (idx > maxIndex) maxIndex = idx;
  });

  const row = new Array<string>(maxIndex + 1).fill("");

  headerIndexMap.forEach((idx, headerName) => {
    const val = record[headerName];
    if (val === undefined || val === null) {
      row[idx] = "";
    } else if (typeof val === "boolean") {
      row[idx] = val ? "TRUE" : "FALSE";
    } else {
      row[idx] = String(val);
    }
  });

  return row;
}
