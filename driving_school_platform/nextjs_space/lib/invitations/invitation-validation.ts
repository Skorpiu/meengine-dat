import { z } from "zod";
import { INVITABLE_USER_ROLES } from "./invitation-policy";

export const createInvitationBodySchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(INVITABLE_USER_ROLES),
  expiresInDays: z.number().int().min(1).max(30).optional(),
});

export type CreateInvitationBody = z.infer<typeof createInvitationBodySchema>;
