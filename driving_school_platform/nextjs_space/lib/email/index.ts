export { sendEmail } from "./email-service";
export {
  buildEmailLogContext,
  redactEmailRecipient,
  redactSensitiveUrls,
  sanitizeEmailErrorMessage,
} from "./redaction";
export type {
  EmailErrorCode,
  EmailProvider,
  EmailProviderId,
  SendEmailInput,
  SendEmailResult,
  SendEmailErrorResult,
  SendEmailSuccessResult,
} from "./types";
export { noopEmailProvider } from "./providers/noop-provider";
export {
  buildInvitationEmail,
  formatInvitationEmailExpiry,
  invitationEmailRoleLabel,
} from "./templates/invitation-email";
export type {
  BuildInvitationEmailInput,
  BuildInvitationEmailResult,
} from "./templates/invitation-email";
