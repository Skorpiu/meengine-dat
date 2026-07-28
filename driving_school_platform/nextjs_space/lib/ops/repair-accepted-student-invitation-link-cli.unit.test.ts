import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const assertRemoteOperatorTargetAllowed = vi.fn();
  const formatRemoteOperatorTargetRefusalMessage = vi.fn(
    () => "target refused",
  );
  const repairAcceptedStudentInvitationLink = vi.fn();
  const parseRepairAcceptedStudentInvitationLinkArgs = vi.fn();
  const formatPlan = vi.fn(() => "plan-text");
  const formatFailure = vi.fn((code: string) => `fail:${code}`);
  const prismaDisconnect = vi.fn();
  const PrismaClient = vi.fn(function PrismaClient(this: {
    $disconnect: typeof prismaDisconnect;
  }) {
    this.$disconnect = prismaDisconnect;
  });

  return {
    assertRemoteOperatorTargetAllowed,
    formatRemoteOperatorTargetRefusalMessage,
    repairAcceptedStudentInvitationLink,
    parseRepairAcceptedStudentInvitationLinkArgs,
    formatPlan,
    formatFailure,
    prismaDisconnect,
    PrismaClient,
  };
});

vi.mock("@/lib/ops/remote-operator-target-guard", () => ({
  REMOTE_OPS_EXPECTED_DB_HOST_ENV: "DAT_OPS_EXPECTED_DB_HOST",
  REMOTE_OPS_EXPECTED_DB_NAME_ENV: "DAT_OPS_EXPECTED_DB_NAME",
  REMOTE_OPS_EXPECTED_SUPABASE_PROJECT_REF_ENV:
    "DAT_OPS_EXPECTED_SUPABASE_PROJECT_REF",
  assertRemoteOperatorTargetAllowed: h.assertRemoteOperatorTargetAllowed,
  formatRemoteOperatorTargetRefusalMessage:
    h.formatRemoteOperatorTargetRefusalMessage,
}));

vi.mock("@/lib/ops/repair-accepted-student-invitation-link", () => ({
  parseRepairAcceptedStudentInvitationLinkArgs:
    h.parseRepairAcceptedStudentInvitationLinkArgs,
  repairAcceptedStudentInvitationLink: h.repairAcceptedStudentInvitationLink,
  formatRepairAcceptedStudentInvitationLinkPlanText: h.formatPlan,
  formatRepairAcceptedStudentInvitationLinkFailureMessage: h.formatFailure,
}));

vi.mock("@prisma/client", () => ({
  PrismaClient: h.PrismaClient,
}));

import { runRepairAcceptedStudentInvitationLinkCli } from "../../scripts/repair-accepted-student-invitation-link";

describe("runRepairAcceptedStudentInvitationLinkCli", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    h.parseRepairAcceptedStudentInvitationLinkArgs.mockReturnValue({
      apply: false,
      unknownFlags: [],
    });
    h.assertRemoteOperatorTargetAllowed.mockReturnValue({
      ok: true,
      target: {
        host: "db.example",
        port: null,
        database: "postgres",
        projectRef: "abcd",
      },
      safeSummary: {
        host: "db.example",
        port: null,
        database: "postgres",
        projectRefPrefix: "abcd…",
        validationStatus: "authorized",
      },
    });
    h.repairAcceptedStudentInvitationLink.mockResolvedValue({
      ok: true,
      plan: {
        alreadyLinked: false,
        wouldWrite: true,
      },
      applied: false,
      wrote: false,
    });
    h.prismaDisconnect.mockResolvedValue(undefined);
  });

  it("fails closed on unknown flags before target guard / Prisma", async () => {
    h.parseRepairAcceptedStudentInvitationLinkArgs.mockReturnValue({
      apply: false,
      unknownFlags: ["--email=x@y.z"],
    });

    await runRepairAcceptedStudentInvitationLinkCli(
      ["--email=x@y.z"],
      {} as unknown as NodeJS.ProcessEnv,
    );

    expect(h.assertRemoteOperatorTargetAllowed).not.toHaveBeenCalled();
    expect(h.PrismaClient).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
    process.exitCode = undefined;
  });

  it("runs target guard before Prisma Client construction", async () => {
    const order: string[] = [];
    h.assertRemoteOperatorTargetAllowed.mockImplementation(() => {
      order.push("guard");
      return {
        ok: true,
        target: {
          host: "db.example",
          port: null,
          database: "postgres",
          projectRef: "abcd",
        },
        safeSummary: {
          host: "db.example",
          port: null,
          database: "postgres",
          projectRefPrefix: "abcd…",
          validationStatus: "authorized",
        },
      };
    });
    h.PrismaClient.mockImplementation(function PrismaClient(this: {
      $disconnect: typeof h.prismaDisconnect;
    }) {
      order.push("prisma");
      this.$disconnect = h.prismaDisconnect;
    });

    await runRepairAcceptedStudentInvitationLinkCli([], {
      DATABASE_URL: "postgresql://u:p@db.example/postgres",
      DAT_OPS_EXPECTED_DB_HOST: "db.example",
      DAT_OPS_EXPECTED_DB_NAME: "postgres",
      DAT_OPS_EXPECTED_SUPABASE_PROJECT_REF: "abcd",
      DAT_SMOKE_INVITED_STUDENT_EMAIL: "invite.student@example.test",
    } as unknown as NodeJS.ProcessEnv);

    expect(order).toEqual(["guard", "prisma"]);
    expect(h.repairAcceptedStudentInvitationLink).toHaveBeenCalled();
    expect(h.prismaDisconnect).toHaveBeenCalled();
  });

  it("refuses when target guard fails and does not construct Prisma", async () => {
    h.assertRemoteOperatorTargetAllowed.mockReturnValue({
      ok: false,
      code: "host_mismatch",
      message: "refused",
      safeSummary: {
        host: null,
        port: null,
        database: null,
        projectRefPrefix: null,
        validationStatus: "refused",
      },
    });

    await runRepairAcceptedStudentInvitationLinkCli([], {
      DATABASE_URL: "postgresql://u:p@wrong/postgres",
    } as unknown as NodeJS.ProcessEnv);

    expect(h.PrismaClient).not.toHaveBeenCalled();
    expect(h.repairAcceptedStudentInvitationLink).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
    process.exitCode = undefined;
  });
});
