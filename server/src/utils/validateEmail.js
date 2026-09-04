// Deliberately simple — this only checks structural format (has an @, a
// domain with a dot, no whitespace), which is all format validation can
// ever prove. Actual ownership of the address is proven separately by the
// email verification flow (see verificationToken.js / emailService.js).
const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmailFormat = (email) => typeof email === "string" && EMAIL_FORMAT_REGEX.test(email.trim());
