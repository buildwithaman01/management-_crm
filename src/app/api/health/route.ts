import { NextResponse } from "next/server";
import { getClientConfig } from "@/config/client-config";

export async function GET() {
  try {
    const config = getClientConfig();
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      client: {
        id: config.id,
        businessName: config.businessName,
      },
      env: {
        nodeEnv: process.env.NODE_ENV,
        hasSheetsConfig: Boolean(
          process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
            process.env.GOOGLE_PRIVATE_KEY &&
            process.env.SPREADSHEET_ID
        ),
        hasCloudinaryConfig: Boolean(
          process.env.CLOUDINARY_CLOUD_NAME &&
            process.env.CLOUDINARY_API_KEY &&
            process.env.CLOUDINARY_API_SECRET
        ),
        hasRedis: Boolean(
          process.env.UPSTASH_REDIS_REST_URL &&
            process.env.UPSTASH_REDIS_REST_TOKEN
        ),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { status: "error", message },
      { status: 500 }
    );
  }
}
