const INVITE_PENDING_LICENSE_PREFIX = "INVITE-PENDING-";

export function isInvitePendingInstructorLicenseNumber(
  value: string | null | undefined,
): boolean {
  if (!value?.trim()) {
    return false;
  }
  return value.trim().startsWith(INVITE_PENDING_LICENSE_PREFIX);
}

export function normalizeInstructorLicenseNumber(value: string): string {
  return value.trim();
}

export function parseInstructorLicenseExpiryDate(value: string): Date | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

export function isInstructorLicenseExpiryTodayOrFuture(value: string): boolean {
  const parsed = parseInstructorLicenseExpiryDate(value);
  if (!parsed) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(parsed);
  expiry.setHours(0, 0, 0, 0);
  return expiry >= today;
}
