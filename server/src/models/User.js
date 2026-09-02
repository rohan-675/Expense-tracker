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
