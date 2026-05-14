import { prisma } from "@/lib/db";
import { LESSON_TYPES } from "@/lib/constants";
import {
  decideDemoWriteSandbox,
  isDemoWriteSandboxEnabled,
  type DemoWriteSandboxCategory,
} from "@/lib/demo/demo-write-sandbox-policy";

const MSG_RESTRICTED =
  "This action is restricted in the public demo environment.";
const MSG_QUOTA = "This demo sandbox quota has already been used.";

export type DemoWriteSandboxRouteDecision =
  | { allowed: true }
  | {
      allowed: false;
      status: 403;
      code: "demo_restricted_action" | "demo_write_quota_exceeded";
      message: string;
    };

function blockedRestricted(): DemoWriteSandboxRouteDecision {
  return {
    allowed: false,
    status: 403,
    code: "demo_restricted_action",
    message: MSG_RESTRICTED,
  };
}

function blockedQuota(): DemoWriteSandboxRouteDecision {
  return {
    allowed: false,
    status: 403,
    code: "demo_write_quota_exceeded",
    message: MSG_QUOTA,
  };
}

function lessonTypeToCategory(
  lessonType: string,
): DemoWriteSandboxCategory | null {
  if (lessonType === LESSON_TYPES.THEORY) return "lesson_theory";
  if (lessonType === LESSON_TYPES.DRIVING) return "lesson_driving";
  if (
    lessonType === LESSON_TYPES.EXAM ||
    lessonType === LESSON_TYPES.THEORY_EXAM
  ) {
    return "lesson_exam";
  }
  return null;
}

export async function decideDemoLessonCreate(input: {
  organizationId: string;
  lessonType: string;
  pendingCreates?: number;
}): Promise<DemoWriteSandboxRouteDecision> {
  const organization = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { isDemo: true },
  });

  if (!organization) {
    return blockedRestricted();
  }

  if (!organization.isDemo) {
    return { allowed: true };
  }

  const category = lessonTypeToCategory(input.lessonType);
  if (!category) {
    return { allowed: true };
  }

  const sandboxEnabled = isDemoWriteSandboxEnabled();
  if (!sandboxEnabled) {
    return blockedRestricted();
  }

  let currentCount = 0;
  if (category === "lesson_theory") {
    currentCount = await prisma.lesson.count({
      where: {
        organizationId: input.organizationId,
        lessonType: LESSON_TYPES.THEORY,
      },
    });
  } else if (category === "lesson_driving") {
    currentCount = await prisma.lesson.count({
      where: {
        organizationId: input.organizationId,
        lessonType: LESSON_TYPES.DRIVING,
      },
    });
  } else {
    currentCount = await prisma.lesson.count({
      where: {
        organizationId: input.organizationId,
        lessonType: { in: [LESSON_TYPES.EXAM, LESSON_TYPES.THEORY_EXAM] },
      },
    });
  }

  const decision = decideDemoWriteSandbox({
    isDemoOrganization: true,
    sandboxEnabled: true,
    category,
    currentCount,
    pendingCreates: input.pendingCreates,
  });

  if (decision.allowed) {
    return { allowed: true };
  }
  if (decision.reason === "demo_write_sandbox_disabled") {
    return blockedRestricted();
  }
  return blockedQuota();
}

export async function decideDemoVehicleCreate(input: {
  organizationId: string;
}): Promise<DemoWriteSandboxRouteDecision> {
  const organization = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { isDemo: true },
  });

  if (!organization) {
    return blockedRestricted();
  }

  if (!organization.isDemo) {
    return { allowed: true };
  }

  const sandboxEnabled = isDemoWriteSandboxEnabled();
  if (!sandboxEnabled) {
    return blockedRestricted();
  }

  const currentCount = await prisma.vehicle.count({
    where: { organizationId: input.organizationId },
  });

  const decision = decideDemoWriteSandbox({
    isDemoOrganization: true,
    sandboxEnabled: true,
    category: "vehicle",
    currentCount,
  });

  if (decision.allowed) {
    return { allowed: true };
  }
  if (decision.reason === "demo_write_sandbox_disabled") {
    return blockedRestricted();
  }
  return blockedQuota();
}
