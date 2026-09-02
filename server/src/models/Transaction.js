import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet"
    },
    recurringId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RecurringTransaction"
    },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: [true, "Transaction type is required"]
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than zero"]
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now
    },
    description: {
      type: String,
      trim: true,
      maxlength: 180,
      default: ""
    },
    receipt: {
      originalName: String,
      fileName: String,
      mimeType: String,
      url: String,
      size: Number
    }
  },
  { timestamps: true }
);

// The most common query shape across the app (transaction history,
// analytics, budget spend totals, the AI assistant's context) filters by
// userId and a date range. This compound index serves all of them; no
// other compound index is currently needed.
transactionSchema.index({ userId: 1, date: -1 });

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
