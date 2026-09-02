import multer from "multer";
import { ALLOWED_RECEIPT_TYPES } from "../utils/receiptTypes.js";

// Files are held in memory only long enough to hand off to storageService
// (local disk or S3), which decides where they actually end up. This keeps
// the upload pipeline the same regardless of which storage backend is
// configured — see src/services/storageService.js.
const storage = multer.memoryStorage();

const fileFilter = (_req, file, callback) => {
  if (!ALLOWED_RECEIPT_TYPES.has(file.mimetype)) {
    return callback(new Error("Only JPEG, PNG, WEBP images and PDF files are allowed"));
  }
  return callback(null, true);
};

export const uploadReceiptFile = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  }
});
