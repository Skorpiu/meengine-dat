/**
 * Central auth/email rate-limit actions and default limits (DAT_3.5).
 * Tune here; document changes in docs/engineering/auth-rate-limit-foundation.md.
 */

export const AUTH_RATE_LIMIT_ACTIONS = {
  loginIp: "auth.login.ip",
  loginEmail: "auth.login.email",
  passwordResetRequestIp: "auth.password-reset.request.ip",
  passwordResetRequestEmail: "auth.password-reset.request.email",
  emailVerificationRequestIp: "auth.email-verification.request.ip",
  emailVerificationRequestEmail: "auth.email-verification.request.email",
  invitationAcceptIp: "auth.invitation.accept.ip",
  invitationAcceptToken: "auth.invitation.accept.token",
  signupIp: "auth.signup.ip",
} as const;

export type AuthRateLimitAction =
  (typeof AUTH_RATE_LIMIT_ACTIONS)[keyof typeof AUTH_RATE_LIMIT_ACTIONS];

export type AuthRateLimitPolicy = {
  action: AuthRateLimitAction;
  limit: number;
  windowSeconds: number;
};

const FIFTEEN_MINUTES = 15 * 60;
const ONE_HOUR = 60 * 60;

/** Per-IP login attempts (all emails combined on this IP). */
export const LOGIN_IP_POLICY: AuthRateLimitPolicy = {
  action: AUTH_RATE_LIMIT_ACTIONS.loginIp,
  limit: 20,
  windowSeconds: FIFTEEN_MINUTES,
};

/** Per-email login attempts. */
export const LOGIN_EMAIL_POLICY: AuthRateLimitPolicy = {
  action: AUTH_RATE_LIMIT_ACTIONS.loginEmail,
  limit: 10,
  windowSeconds: FIFTEEN_MINUTES,
};

export const PASSWORD_RESET_REQUEST_IP_POLICY: AuthRateLimitPolicy = {
  action: AUTH_RATE_LIMIT_ACTIONS.passwordResetRequestIp,
  limit: 20,
  windowSeconds: ONE_HOUR,
};

export const PASSWORD_RESET_REQUEST_EMAIL_POLICY: AuthRateLimitPolicy = {
  action: AUTH_RATE_LIMIT_ACTIONS.passwordResetRequestEmail,
  limit: 5,
  windowSeconds: ONE_HOUR,
};

export const EMAIL_VERIFICATION_REQUEST_IP_POLICY: AuthRateLimitPolicy = {
  action: AUTH_RATE_LIMIT_ACTIONS.emailVerificationRequestIp,
  limit: 20,
  windowSeconds: ONE_HOUR,
};

export const EMAIL_VERIFICATION_REQUEST_EMAIL_POLICY: AuthRateLimitPolicy = {
  action: AUTH_RATE_LIMIT_ACTIONS.emailVerificationRequestEmail,
  limit: 5,
  windowSeconds: ONE_HOUR,
};

export const INVITATION_ACCEPT_IP_POLICY: AuthRateLimitPolicy = {
  action: AUTH_RATE_LIMIT_ACTIONS.invitationAcceptIp,
  limit: 30,
  windowSeconds: FIFTEEN_MINUTES,
};

export const INVITATION_ACCEPT_TOKEN_POLICY: AuthRateLimitPolicy = {
  action: AUTH_RATE_LIMIT_ACTIONS.invitationAcceptToken,
  limit: 10,
  windowSeconds: FIFTEEN_MINUTES,
};

/** Public signup (when enabled) — IP only; signup remains disabled by default. */
export const SIGNUP_IP_POLICY: AuthRateLimitPolicy = {
  action: AUTH_RATE_LIMIT_ACTIONS.signupIp,
  limit: 10,
  windowSeconds: ONE_HOUR,
};
