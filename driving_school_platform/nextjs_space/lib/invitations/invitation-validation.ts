import { z } from "zod";
import { isInstructorLicenseExpiryTodayOrFuture } from "@/lib/instructors/instructor-license-utils";
import { INVITABLE_USER_ROLES } from "./invitation-policy";

const instructorLicenseNumberField = z.string().optional();
const instructorLicenseExpiryField = z.string().optional();

export const createInvitationBodySchema = z
  .object({
    email: z.string().email("Invalid email address"),
    role: z.enum(INVITABLE_USER_ROLES),
    expiresInDays: z.number().int().min(1).max(30).optional(),
    instructorLicenseNumber: instructorLicenseNumberField,
    instructorLicenseExpiry: instructorLicenseExpiryField,
  })
  .superRefine((data, ctx) => {
    if (data.role === "INSTRUCTOR") {
      const licenseNumber = data.instructorLicenseNumber?.trim() ?? "";
      if (!licenseNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Instructor license number is required",
          path: ["instructorLicenseNumber"],
        });
      }

      const expiry = data.instructorLicenseExpiry?.trim() ?? "";
      if (!expiry) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Instructor license expiration date is required",
          path: ["instructorLicenseExpiry"],
        });
      } else if (!isInstructorLicenseExpiryTodayOrFuture(expiry)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Instructor license expiration date must be today or in the future",
          path: ["instructorLicenseExpiry"],
        });
      }
      return;
    }

    const hasLicenseNumber = Boolean(data.instructorLicenseNumber?.trim());
    const hasLicenseExpiry = Boolean(data.instructorLicenseExpiry?.trim());
    if (hasLicenseNumber || hasLicenseExpiry) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Instructor license fields are only allowed for INSTRUCTOR invitations",
        path: ["instructorLicenseNumber"],
      });
    }
  });

export type CreateInvitationBody = z.infer<typeof createInvitationBodySchema>;
