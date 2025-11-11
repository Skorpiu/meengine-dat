
/**
 * Server-side Feature Check Middleware
 * 
 * Use this in API routes to enforce feature access control
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { LicenseService } from '@/lib/services/license-service';
import { db } from '@/lib/db';
import type { FeatureKey } from '@/lib/config/license-features';

export async function checkFeatureAccess(featureKey: FeatureKey): Promise<{
  allowed: boolean;
  organizationId?: string;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return { allowed: false, error: 'Unauthorized' };
    }

    // Get user with organization
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true, role: true },
    });

    if (!user) {
      return { allowed: false, error: 'User not found' };
    }

    if (!user.organizationId) {
      return { allowed: false, error: 'No organization found' };
    }

    // Check if feature is enabled
    const isEnabled = await LicenseService.isFeatureEnabled(user.organizationId, featureKey);

    if (!isEnabled) {
      return { allowed: false, error: 'Feature not enabled' };
    }

    return { allowed: true, organizationId: user.organizationId };
  } catch (error) {
    console.error('Error checking feature access:', error);
    return { allowed: false, error: 'Internal server error' };
  }
}
