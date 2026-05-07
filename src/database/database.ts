import mongoose from "mongoose";
import { env } from "../env/index.js";

export async function connectDB(): Promise<void> {
  await mongoose.connect(env.DATABASE_URL);
  console.log("Database connected");
}
