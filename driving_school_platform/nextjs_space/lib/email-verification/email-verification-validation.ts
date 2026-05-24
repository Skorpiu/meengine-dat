import { z } from "zod";
import { commonSchemas } from "@/lib/validation";

export const emailVerificationRequestBodySchema = z.object({
  email: commonSchemas.email,
});

export const emailVerificationConfirmBodySchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

export type EmailVerificationRequestBody = z.infer<
  typeof emailVerificationRequestBodySchema
>;
export type EmailVerificationConfirmBody = z.infer<
  typeof emailVerificationConfirmBodySchema
>;
