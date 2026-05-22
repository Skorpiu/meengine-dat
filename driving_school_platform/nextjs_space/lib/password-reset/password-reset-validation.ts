import { z } from "zod";
import { commonSchemas } from "@/lib/validation";

export const passwordResetRequestBodySchema = z.object({
  email: commonSchemas.email,
});

export const passwordResetConfirmBodySchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: commonSchemas.password,
});

export type PasswordResetRequestBody = z.infer<
  typeof passwordResetRequestBodySchema
>;
export type PasswordResetConfirmBody = z.infer<
  typeof passwordResetConfirmBodySchema
>;
