import { z } from "zod";

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.email().optional(),
  password: z.string().min(6).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
