import { prisma } from "@/lib/db";
import {
  decideDemoMutation,
  type DemoMutationCategory,
  type DemoMutationDecision,
} from "@/lib/demo/demo-policy";

const DEMO_RESTRICTED_MESSAGE =
  "This action is restricted in the public demo environment.";

export type DemoRouteMutationDecision =
  | { allowed: true }
  | {
      allowed: false;
      reason: "demo_restricted_action";
      status: 403;
      message: string;
    };

export async function decideDemoRouteMutation(input: {
  organizationId: string;
  category: DemoMutationCategory;
}): Promise<DemoRouteMutationDecision> {
  const organization = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { isDemo: true },
  });

  if (!organization) {
    return {
      allowed: false,
      reason: "demo_restricted_action",
      status: 403,
      message: DEMO_RESTRICTED_MESSAGE,
    };
  }

  const core: DemoMutationDecision = decideDemoMutation({
    isDemoOrganization: organization.isDemo,
    category: input.category,
  });

  if (core.allowed) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: core.reason,
    status: 403,
    message: DEMO_RESTRICTED_MESSAGE,
  };
}
