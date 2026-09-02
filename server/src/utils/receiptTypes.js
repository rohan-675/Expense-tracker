export const ALLOWED_RECEIPT_TYPES = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["application/pdf", ".pdf"]
]);

export const extensionForMimeType = (mimeType, originalName = "") => {
  if (ALLOWED_RECEIPT_TYPES.has(mimeType)) return ALLOWED_RECEIPT_TYPES.get(mimeType);
  const dotIndex = originalName.lastIndexOf(".");
  return dotIndex >= 0 ? originalName.slice(dotIndex).toLowerCase() : "";
};
