/**
 * Credentials login eligibility for non-admin tenant users.
 * Returns a block reason or null when login may proceed.
 */
export function getCredentialsLoginBlockReason(user: {
  role: string;
  isApproved: boolean;
}): "not_approved" | null {
  if (user.role !== "SUPER_ADMIN" && !user.isApproved) {
    return "not_approved";
  }
  return null;
}
