import { z } from "zod";

export const changeInvitationEmailBodySchema = z.object({
  newEmail: z.string().trim().min(1, "invalid_email").email("invalid_email"),
});

export type ChangeInvitationEmailBody = z.infer<
  typeof changeInvitationEmailBodySchema
>;
