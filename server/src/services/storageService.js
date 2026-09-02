import fs from "fs";
import path from "path";
import crypto from "crypto";
import { PutObjectCommand, DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { extensionForMimeType } from "../utils/receiptTypes.js";

const STORAGE_DRIVER = (process.env.STORAGE_DRIVER || "local").toLowerCase();

const receiptDir = path.join(process.cwd(), "uploads", "receipts");

let s3Client = null;
const getS3Client = () => {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.S3_REGION,
      endpoint: process.env.S3_ENDPOINT || undefined, // needed for R2 / B2 / Spaces, unset for real AWS S3
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
      }
    });
  }
  return s3Client;
};

/**
 * Persists an uploaded receipt file and returns the metadata to store on
 * the transaction document. Storage backend is selected via STORAGE_DRIVER:
 *   - "local" (default): writes to disk under `uploads/receipts`, served by
 *     the app itself via `/uploads`. Fine for a single-instance deployment
 *     with a real persistent volume (e.g. a VPS or a host with attached
 *     storage) — but files WILL be lost on redeploy/restart on platforms
 *     with an ephemeral filesystem.
 *   - "s3": uploads to any S3-compatible bucket (AWS S3, Cloudflare R2,
 *     Backblaze B2, DigitalOcean Spaces). Required env vars: S3_BUCKET,
 *     S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PUBLIC_URL
 *     (the public base URL to prefix onto the object key), and S3_ENDPOINT
 *     for non-AWS providers.
 */
export const saveReceiptFile = async (file) => {
  const extension = extensionForMimeType(file.mimetype, file.originalname);
  const fileName = `${crypto.randomUUID()}${extension}`;

  if (STORAGE_DRIVER === "s3") {
    const bucket = process.env.S3_BUCKET;
    const publicUrl = process.env.S3_PUBLIC_URL;

    if (!bucket || !publicUrl) {
      throw new Error("S3_BUCKET and S3_PUBLIC_URL must be set when STORAGE_DRIVER=s3");
    }

    const key = `receipts/${fileName}`;
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype
      })
    );

    return {
      fileName,
      url: `${publicUrl.replace(/\/$/, "")}/${key}`
    };
  }

  // Local disk (default)
  fs.mkdirSync(receiptDir, { recursive: true });
  fs.writeFileSync(path.join(receiptDir, fileName), file.buffer);

  return {
    fileName,
    url: `/uploads/receipts/${fileName}`
  };
};

export const deleteReceiptFile = async (fileName) => {
  if (!fileName) return;

  if (STORAGE_DRIVER === "s3") {
    const bucket = process.env.S3_BUCKET;
    if (!bucket) return;

    await getS3Client()
      .send(new DeleteObjectCommand({ Bucket: bucket, Key: `receipts/${fileName}` }))
      .catch(() => {}); // best-effort cleanup, don't fail the request over it
    return;
  }

  fs.promises.unlink(path.join(receiptDir, fileName)).catch(() => {});
};

export const isUsingEphemeralLocalStorage = () =>
  STORAGE_DRIVER !== "s3" && process.env.NODE_ENV === "production";
