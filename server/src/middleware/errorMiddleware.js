import multer from "multer";

export const notFound = (req, res, next) => {
  const error = new Error(`Not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export const errorHandler = (err, _req, res, _next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || "Server error";

  if (err instanceof multer.MulterError) {
    statusCode = 400;
    message = err.code === "LIMIT_FILE_SIZE" ? "Uploaded file is too large" : err.message;
  }

  if (err.message === "Only JPEG, PNG, WEBP images and PDF files are allowed") {
    statusCode = 400;
  }

  // Every model (Transaction, Budget, SavingsGoal, Wallet, User) already
  // declares real constraints (enum, min, maxlength) at the schema level.
  // Without this, a validation failure (e.g. a negative amount) would
  // otherwise surface as a raw Mongoose error with an unset/500 status
  // instead of the clean 400 it actually is.
  if (err.name === "ValidationError" && err.errors) {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((fieldError) => fieldError.message)
      .join(" ");
  }

  // A malformed ObjectId (e.g. a garbage :id route param) throws this
  // before it ever reaches a controller's own isValid() check in some
  // paths (e.g. populate lookups) — treat it as a client input error, not
  // a server failure.
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path || "id"} provided`;
  }

  // Mongo duplicate-key error (unique index violation) — the app already
  // pre-checks the common case (duplicate email at registration), but this
  // is a safety net for any other unique constraint.
  if (err.code === 11000) {
    statusCode = 409;
    message = "This value is already in use";
  }

  // Anything left at this point that's still a genuine 500 is, by
  // definition, unexpected — never forward its raw message to the client
  // in production (it could be a driver error, an internal path, etc.),
  // but always log the real thing server-side so it isn't silently lost.
  if (statusCode === 500) {
    console.error("Unhandled server error:", err);
    if (process.env.NODE_ENV === "production") {
      message = "Something went wrong. Please try again later.";
    }
  }

  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack })
  });
};
