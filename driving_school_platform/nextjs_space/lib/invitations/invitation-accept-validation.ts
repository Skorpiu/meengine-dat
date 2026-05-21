import { z } from "zod";
import { commonSchemas } from "@/lib/validation";

export const acceptInvitationBodySchema = z.object({
  token: z.string().min(1, "Invitation token is required"),
  firstName: commonSchemas.name,
  lastName: commonSchemas.name,
  password: commonSchemas.password,
});

export type AcceptInvitationBody = z.infer<typeof acceptInvitationBodySchema>;
