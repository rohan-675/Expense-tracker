import mongoose from "mongoose";

const recurringTransactionSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: ["income", "expense"],
      required: true
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, "Amount must be greater than zero"]
    },
    frequency: {
      type: String,
      enum: ["weekly", "monthly"],
      required: true
    },
    startDate: {
      type: Date,
      required: true
    },
    nextRunAt: {
      type: Date,
      required: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: 180,
      default: ""
    },
    active: {
      type: Boolean,
      default: true
    },
    lastGeneratedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

const RecurringTransaction = mongoose.model("RecurringTransaction", recurringTransactionSchema);

export default RecurringTransaction;

