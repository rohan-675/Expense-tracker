import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { ALLOWED_CURRENCIES } from "../utils/currencies.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true
    },
    googleId: {
      type: String,
      index: true
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local"
    },
    password: {
      type: String,
      required: function requirePassword() {
        return this.authProvider === "local";
      },
      minlength: 8
    },
    currency: {
      type: String,
      enum: ALLOWED_CURRENCIES,
      default: "USD",
      uppercase: true
    },
    // Google accounts are considered verified immediately, since Google
    // has already cryptographically proven ownership of the email via its
    // own OAuth flow — no separate email-link step is needed for them.
    // Local (password) accounts start unverified and must click the link
    // sent to their email before they can log in.
    emailVerified: {
      type: Boolean,
      default: false
    },
    // Only the SHA-256 hash of the verification token is ever stored, the
    // same pattern as a password-reset token — so a database leak alone
    // can't be used to verify/hijack an account; the raw token only ever
    // exists in the emailed link.
    verificationTokenHash: {
      type: String,
      select: false
    },
    verificationTokenExpiry: {
      type: Date,
      select: false
    }
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.password || !this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  return next();
});

userSchema.methods.matchPassword = function matchPassword(enteredPassword) {
  if (!this.password) return false;
  return bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
