import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["DEV", "TEST", "PROD"]).default("DEV"),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.url(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("Invalid variables", z.treeifyError(_env.error));

  throw new Error("Invalid environment variables.");
}

export const env = _env.data;
