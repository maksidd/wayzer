import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_BASE_URL) {
  console.warn(
    "[R2] Missing configuration. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME and R2_PUBLIC_BASE_URL in environment.",
  );
}

export const r2Client =
  R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY
    ? new S3Client({
        region: "auto",
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: R2_ACCESS_KEY_ID,
          secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
      })
    : null;

export async function uploadToR2(params: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<string> {
  if (!r2Client || !R2_BUCKET_NAME || !R2_PUBLIC_BASE_URL) {
    throw new Error("R2 is not configured. Check environment variables.");
  }

  const { key, body, contentType } = params;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  return `${R2_PUBLIC_BASE_URL.replace(/\/+$/, "")}/${key}`;
}

export async function deleteFromR2(key: string): Promise<void> {
  if (!r2Client || !R2_BUCKET_NAME) {
    return;
  }

  try {
    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      }),
    );
  } catch (err) {
    console.error("[R2] Failed to delete object", key, err);
  }
}

export function buildR2Url(key: string): string {
  if (!R2_PUBLIC_BASE_URL) {
    throw new Error("R2_PUBLIC_BASE_URL is not configured.");
  }
  return `${R2_PUBLIC_BASE_URL.replace(/\/+$/, "")}/${key}`;
}

export function extractR2KeyFromUrl(url: string): string | null {
  if (!R2_PUBLIC_BASE_URL) {
    return null;
  }

  const normalizedBase = R2_PUBLIC_BASE_URL.replace(/\/+$/, "");
  if (!url.startsWith(normalizedBase)) {
    return null;
  }

  return url.slice(normalizedBase.length + 1);
}





