import { v2 as cloudinary } from "cloudinary";

/**
 * Cloudinary Private Storage & Signed URL Generator (Section 12 & Section 24)
 *
 * Security Architecture:
 * - Delivery type: "authenticated" ONLY (never public).
 * - A permanent public URL must NEVER exist for these files.
 * - Files are accessible only via signed, time-limited URLs that expire.
 * - Allowed formats: jpg, jpeg, png, pdf.
 * - Max file size: 5 MB per file.
 * - The secret stays strictly on the server and is never sent to the browser.
 */

export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB (Section 12)
export const ALLOWED_FILE_FORMATS = ["jpg", "jpeg", "png", "pdf"] as const;
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
] as const;

export interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

/**
 * Retrieves Cloudinary credentials from environment variables.
 * In development / test, falls back to safe mock credentials if not configured.
 */
export function getCloudinaryCredentials(): CloudinaryCredentials {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "tuition-bureau-mock";
  const apiKey = process.env.CLOUDINARY_API_KEY || "mock-api-key";
  const apiSecret = process.env.CLOUDINARY_API_SECRET || "mock-api-secret-key-32-chars-signing";

  if (
    process.env.NODE_ENV === "production" &&
    (!process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET)
  ) {
    throw new Error(
      "CRITICAL CLOUDINARY CONFIG ERROR: Missing CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET."
    );
  }

  return { cloudName, apiKey, apiSecret };
}

let isConfigured = false;

/**
 * Ensures Cloudinary SDK is initialized with secure configurations.
 */
export function ensureCloudinaryConfigured(): void {
  const creds = getCloudinaryCredentials();
  cloudinary.config({
    cloud_name: creds.cloudName,
    api_key: creds.apiKey,
    api_secret: creds.apiSecret,
    secure: true,
  });
  isConfigured = true;
}

export interface UploadSignatureOptions {
  folder: string;
  allowedFormats?: string[];
  maxFileSize?: number;
  tags?: string[];
  customParams?: Record<string, any>;
}

export interface UploadSignatureResult {
  signature: string;
  timestamp: number;
  folder: string;
  type: "authenticated";
  apiKey: string;
  cloudName: string;
  // Aliases for compatibility
  api_key: string;
  cloud_name: string;
  uploadUrl: string;
}

/**
 * Generates an upload signature for direct browser-to-Cloudinary authenticated uploads.
 * Adheres to Section 12: Delivery type is strictly 'authenticated', preventing public access.
 *
 * @param folderOrOptions Folder name string (e.g. "tutors/sub_12345") or options object
 */
export function generateUploadSignature(
  folderOrOptions: string | UploadSignatureOptions
): UploadSignatureResult {
  const options: UploadSignatureOptions =
    typeof folderOrOptions === "string"
      ? { folder: folderOrOptions }
      : folderOrOptions;

  if (!options.folder || typeof options.folder !== "string") {
    throw new Error("Target upload folder is required for signature generation.");
  }

  ensureCloudinaryConfigured();
  const { cloudName, apiKey, apiSecret } = getCloudinaryCredentials();
  const timestamp = Math.floor(Date.now() / 1000);

  // Parameters to sign for Cloudinary authenticated direct upload
  const paramsToSign: Record<string, any> = {
    folder: options.folder,
    timestamp,
    type: "authenticated",
    ...options.customParams,
  };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return {
    signature,
    timestamp,
    folder: options.folder,
    type: "authenticated",
    apiKey,
    cloudName,
    api_key: apiKey,
    cloud_name: cloudName,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
  };
}

export interface SignedFileUrlOptions {
  resourceType?: "image" | "raw" | "video";
  format?: string;
  attachment?: boolean;
}

/**
 * Generates a signed, time-limited URL for private authenticated files.
 * Adheres to Section 12: Admin-only signed access with expiration (default 300 seconds / 5 minutes).
 *
 * @param publicId Cloudinary public_id of the file (e.g. "tutors/sub_123/aadhaar")
 * @param expiresInSeconds Time limit in seconds until the signed URL expires (default: 300)
 * @param options Additional options (resourceType, format, attachment)
 */
export function getSignedFileUrl(
  publicId: string,
  expiresInSeconds: number = 300,
  options: SignedFileUrlOptions = {}
): string {
  if (!publicId || typeof publicId !== "string") {
    throw new Error("A valid Cloudinary public_id is required to generate a signed URL.");
  }

  ensureCloudinaryConfigured();
  const cleanPublicId = publicId.replace(/^\/+/, "");
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

  let format = options.format || "";
  let basePublicId = cleanPublicId;

  // Extract extension if embedded in publicId (e.g. "tutors/sub_123/doc.pdf")
  const extMatch = cleanPublicId.match(/\.([a-zA-Z0-9]+)$/);
  if (!format && extMatch) {
    format = extMatch[1];
    basePublicId = cleanPublicId.substring(
      0,
      cleanPublicId.length - extMatch[0].length
    );
  }

  return cloudinary.utils.private_download_url(basePublicId, format, {
    resource_type: options.resourceType || "image",
    type: "authenticated",
    expires_at: expiresAt,
    attachment: options.attachment ?? false,
  });
}

/**
 * Generates a signed CDN delivery URL using an auth token (res.cloudinary.com)
 * Useful for inline image avatars or preview components.
 */
export function getSignedCdnUrl(
  publicId: string,
  expiresInSeconds: number = 300,
  options: { resourceType?: "image" | "raw" | "video" } = {}
): string {
  if (!publicId || typeof publicId !== "string") {
    throw new Error("A valid Cloudinary public_id is required.");
  }

  ensureCloudinaryConfigured();
  const { apiSecret } = getCloudinaryCredentials();

  return cloudinary.url(publicId, {
    secure: true,
    resource_type: options.resourceType || "image",
    type: "authenticated",
    sign_url: true,
    auth_token: {
      key: apiSecret,
      duration: expiresInSeconds,
    },
  });
}

/**
 * Deletes a private authenticated file from Cloudinary (Section 12 & Section 24 Anonymization)
 */
export async function deleteCloudinaryFile(
  publicId: string,
  resourceType: "image" | "raw" | "video" = "image"
): Promise<{ result: string }> {
  ensureCloudinaryConfigured();
  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    type: "authenticated",
  });
}

/**
 * Validates that the uploaded file format is in the allowed whitelist (jpg, png, pdf)
 */
export function isAllowedUploadFormat(filenameOrExtension: string): boolean {
  if (!filenameOrExtension || typeof filenameOrExtension !== "string") {
    return false;
  }
  const ext =
    filenameOrExtension.split(".").pop()?.toLowerCase() ||
    filenameOrExtension.toLowerCase();
  return (ALLOWED_FILE_FORMATS as readonly string[]).includes(ext);
}

/**
 * Validates file size against the 5 MB ceiling (Section 12)
 */
export function validateFileSize(
  sizeInBytes: number,
  maxBytes = MAX_UPLOAD_SIZE_BYTES
): boolean {
  return typeof sizeInBytes === "number" && sizeInBytes > 0 && sizeInBytes <= maxBytes;
}
