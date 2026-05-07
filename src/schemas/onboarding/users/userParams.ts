import { z } from "zod";

export const userParamsSchema = z.object({
  id: z.string().min(1, "ID is required"),
});

export type UserParams = z.infer<typeof userParamsSchema>;
