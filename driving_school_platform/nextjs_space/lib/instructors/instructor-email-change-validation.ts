import { z } from "zod";

export const changeInstructorEmailBodySchema = z.object({
  newEmail: z.string().trim().min(1, "invalid_email").email("invalid_email"),
});

export type ChangeInstructorEmailBody = z.infer<
  typeof changeInstructorEmailBodySchema
>;
