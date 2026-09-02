import mongoose from "mongoose";

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing from environment variables");
  }

  // Fail fast with a clear error if the URI/credentials/network access are
  // wrong, instead of hanging on Mongoose's default ~30s selection timeout.
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 8000
  });
  console.log("MongoDB connected");
};

export default connectDB;

