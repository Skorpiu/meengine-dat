import { z } from "zod";

export const inviteStudentRecordBodySchema = z
  .object({
    email: z.string().optional(),
  })
  .strict();

export type InviteStudentRecordBody = z.infer<
  typeof inviteStudentRecordBodySchema
>;
