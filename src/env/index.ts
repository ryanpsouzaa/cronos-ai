import { config } from "dotenv";
config({ path: ".env.dev" });

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["DEV", "TEST", "PROD"]).default("DEV"),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32, "JWT secret must be at least 32 characters"),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("Invalid variables", z.treeifyError(_env.error));
  throw new Error("Invalid environment variables.");
}

export const env = _env.data;
