/**
 * JWT session revocation authority (AUTH-SESSION-001 / USER_SESSION_VERSION_EPOCH).
 *
 * Authoritative field: User.authSessionVersion
 * JWT claim: authSessionVersion (legacy missing claim = effective 0)
 *
 * Session.deleteMany is not JWT revocation authority.
 * DB lookup failure fails closed (do not trust the existing JWT).
 */

export const AUTH_SESSION_REVOKED_CODE = "AUTH_SESSION_REVOKED" as const;

export class AuthSessionRevokedError extends Error {
  readonly code = AUTH_SESSION_REVOKED_CODE;

  constructor(message = "Session is no longer valid") {
    super(message);
    this.name = "AuthSessionRevokedError";
  }
}

export type AuthSessionAuthority = {
  id: string;
  authSessionVersion: number;
};

export type AuthSessionAuthorityLoader = (
  userId: string,
) => Promise<AuthSessionAuthority | null>;

/**
 * Legacy JWTs minted before authSessionVersion existed are treated as version 0.
 */
export function resolveEffectiveAuthSessionVersion(
  tokenAuthSessionVersion: unknown,
): number {
  if (
    typeof tokenAuthSessionVersion === "number" &&
    Number.isFinite(tokenAuthSessionVersion)
  ) {
    return tokenAuthSessionVersion;
  }
  return 0;
}

/**
 * Asserts that a JWT's session epoch matches the current User authority.
 * Throws AuthSessionRevokedError on missing sub, missing user, or version mismatch.
 * Propagates loader/database errors (fail closed — do not catch and accept).
 */
export async function assertJwtAuthSessionVersion(input: {
  tokenSub: string | null | undefined;
  tokenAuthSessionVersion: unknown;
  loadAuthority: AuthSessionAuthorityLoader;
}): Promise<number> {
  if (!input.tokenSub) {
    throw new AuthSessionRevokedError();
  }

  const authority = await input.loadAuthority(input.tokenSub);
  if (!authority) {
    throw new AuthSessionRevokedError();
  }

  const effectiveTokenVersion = resolveEffectiveAuthSessionVersion(
    input.tokenAuthSessionVersion,
  );

  if (effectiveTokenVersion !== authority.authSessionVersion) {
    throw new AuthSessionRevokedError();
  }

  return authority.authSessionVersion;
}
