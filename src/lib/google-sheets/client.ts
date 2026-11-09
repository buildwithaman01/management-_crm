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

  // Handle newline escapes in private key (Section 3)
  privateKey = privateKey.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  sheetsClientInstance = google.sheets({ version: "v4", auth });
  return sheetsClientInstance;
}
