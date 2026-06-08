import { z } from "zod";

export const changeStudentEmailBodySchema = z.object({
  newEmail: z.string().trim().min(1, "invalid_email").email("invalid_email"),
});

export type ChangeStudentEmailBody = z.infer<
  typeof changeStudentEmailBodySchema
>;
