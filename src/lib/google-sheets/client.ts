import { google, sheets_v4 } from "googleapis";

let sheetsClientInstance: sheets_v4.Sheets | null = null;

export function getGoogleSheetsClient(): sheets_v4.Sheets {
  if (sheetsClientInstance) {
    return sheetsClientInstance;
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !privateKey) {
    throw new Error(
      "Missing Google Service Account credentials. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY."
    );
  }

  // Handle newline escapes and optional surrounding quotes in private key (Section 3)
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  sheetsClientInstance = google.sheets({ version: "v4", auth });
  return sheetsClientInstance;
}
