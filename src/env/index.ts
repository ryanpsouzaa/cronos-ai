import { config } from "dotenv";
config({ path: ".env.dev" });

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["DEV", "TEST", "PROD"]).default("DEV"),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32, "JWT secret must be at least 32 characters"),
  MINIO_ENDPOINT: z.string().default("localhost"),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_ACCESS_KEY: z.string(),
  MINIO_SECRET_KEY: z.string(),
  MINIO_BUCKET: z.string().default("cronos-ai-resources"),
  MINIO_USE_SSL: z.string().default("false").transform((v) => v === "true"),
  QDRANT_URL: z.string().url().default("http://localhost:6333"),
  QDRANT_COLLECTION: z.string().default("resources"),
  GEMINI_API_KEY: z.string(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("Invalid variables", z.treeifyError(_env.error));
  throw new Error("Invalid environment variables.");
}

export const env = _env.data;
