import { z } from "zod";

export const queryResourceSchema = z.object({
  question: z.string().min(1, "Question cannot be empty").max(1000),
});

export type QueryResourceInput = z.infer<typeof queryResourceSchema>;
