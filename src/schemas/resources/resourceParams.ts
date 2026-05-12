import { z } from "zod";

export const resourceParamsSchema = z.object({
  id: z.string().min(1),
});

export type ResourceParams = z.infer<typeof resourceParamsSchema>;
