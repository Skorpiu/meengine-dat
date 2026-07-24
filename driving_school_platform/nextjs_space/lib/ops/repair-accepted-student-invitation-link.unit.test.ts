import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildAuditLogCreateData } from "@/lib/audit/audit-log-service";
import { DAT_SMOKE_INVITED_STUDENT_EMAIL_ENV } from "@/lib/ops/production-smoke-fixtures-canonical";
import { CANONICAL_SMOKE_ORGANIZATION_NAME } from "@/lib/ops/production-smoke-reconciliation-inspection";
import {
  REPAIR_ACCEPTED_STUDENT_INVITATION_LINK_AUDIT_ACTION,
  formatRepairAcceptedStudentInvitationLinkPlanText,
  parseRepairAcceptedStudentInvitationLinkArgs,
  repairAcceptedStudentInvitationLink,
  type RepairAcceptedStudentInvitationLinkDb,
} from "@/lib/ops/repair-accepted-student-invitation-link";

const ORG_ID = "orgsmokeaaaaaaaa";
const INV_ID = "invsmokebbbbbbbb";
const USER_ID = "usersmokecccccccc";
const STUDENT_ID = "studsmokedddddddd";
const EMAIL = "invite.student@example.test";

function makeDb(overrides?: Partial<RepairAcceptedStudentInvitationLinkDb>): {
  db: RepairAcceptedStudentInvitationLinkDb;
  mocks: {
    organizationFindMany: ReturnType<typeof vi.fn>;
    organizationCount: ReturnType<typeof vi.fn>;
    invitationFindMany: ReturnType<typeof vi.fn>;
    invitationUpdate: ReturnType<typeof vi.fn>;
    userFindMany: ReturnType<typeof vi.fn>;
    studentFindMany: ReturnType<typeof vi.fn>;
    auditCreate: ReturnType<typeof vi.fn>;
    transaction: ReturnType<typeof vi.fn>;
  };
} {
  const organizationFindMany = vi.fn();
  const organizationCount = vi.fn();
  const invitationFindMany = vi.fn();
  const invitationUpdate = vi.fn();
  const userFindMany = vi.fn();
  const studentFindMany = vi.fn();
  const auditCreate = vi.fn();
  const transaction = vi.fn();

  const db = {
    organization: {
      findMany: organizationFindMany,
      count: organizationCount,
    },
    userInvitation: {
      findMany: invitationFindMany,
      update: invitationUpdate,
    },
    user: { findMany: userFindMany },
    student: { findMany: studentFindMany },
    auditLog: { create: auditCreate },
    $transaction: transaction,
    ...overrides,
  } as unknown as RepairAcceptedStudentInvitationLinkDb;

  return {
    db,
    mocks: {
      organizationFindMany,
      organizationCount,
      invitationFindMany,
      invitationUpdate,
      userFindMany,
      studentFindMany,
      auditCreate,
      transaction,
    },
  };
}

function seedHappyPath(mocks: ReturnType<typeof makeDb>["mocks"]) {
  mocks.organizationFindMany.mockResolvedValue([
    { id: ORG_ID, name: CANONICAL_SMOKE_ORGANIZATION_NAME },
  ]);
  mocks.organizationCount.mockResolvedValue(0);
  mocks.invitationFindMany.mockResolvedValue([
    {
      id: INV_ID,
      status: "ACCEPTED",
      acceptedUserId: USER_ID,
      studentId: null,
      email: EMAIL,
      role: "STUDENT",
    },
  ]);
  mocks.userFindMany.mockResolvedValue([
    {
      id: USER_ID,
      email: EMAIL,
      role: "STUDENT",
      organizationId: ORG_ID,
    },
  ]);
  mocks.studentFindMany.mockResolvedValue([
    {
      id: STUDENT_ID,
      userId: USER_ID,
      organizationId: ORG_ID,
      appAccessMode: "APP_USER",
      category: { name: "B" },
    },
  ]);
  mocks.transaction.mockImplementation(
    async (fn: (tx: RepairAcceptedStudentInvitationLinkDb) => unknown) => {
      const tx = {
        organization: {
          findMany: mocks.organizationFindMany,
          count: mocks.organizationCount,
        },
        userInvitation: {
          findMany: mocks.invitationFindMany,
          update: mocks.invitationUpdate,
        },
        user: { findMany: mocks.userFindMany },
        student: { findMany: mocks.studentFindMany },
        auditLog: { create: mocks.auditCreate },
        $transaction: mocks.transaction,
      } as unknown as RepairAcceptedStudentInvitationLinkDb;
      return fn(tx);
    },
  );
  mocks.invitationUpdate.mockResolvedValue({});
  mocks.auditCreate.mockResolvedValue({});
}

describe("parseRepairAcceptedStudentInvitationLinkArgs", () => {
  it("defaults to dry-run", () => {
    expect(parseRepairAcceptedStudentInvitationLinkArgs([])).toEqual({
      apply: false,
      unknownFlags: [],
    });
    expect(parseRepairAcceptedStudentInvitationLinkArgs(["--"])).toEqual({
      apply: false,
      unknownFlags: [],
    });
  });

  it("enables apply for --apply and pnpm-forwarded -- --apply", () => {
    expect(parseRepairAcceptedStudentInvitationLinkArgs(["--apply"])).toEqual({
      apply: true,
      unknownFlags: [],
    });
    expect(
      parseRepairAcceptedStudentInvitationLinkArgs(["--", "--apply"]),
    ).toEqual({
      apply: true,
      unknownFlags: [],
    });
  });

  it("rejects unknown args and duplicate --apply", () => {
    expect(
      parseRepairAcceptedStudentInvitationLinkArgs(["--force"]).unknownFlags,
    ).toContain("--force");
    expect(
      parseRepairAcceptedStudentInvitationLinkArgs(["--apply", "--apply"])
        .unknownFlags,
    ).toContain("--apply(duplicate)");
    expect(
      parseRepairAcceptedStudentInvitationLinkArgs(["--email=x@y.z"])
        .unknownFlags,
    ).toContain("--email=x@y.z");
  });
});

describe("repairAcceptedStudentInvitationLink", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("refuses missing invited student email env", async () => {
    const { db, mocks } = makeDb();
    const result = await repairAcceptedStudentInvitationLink(db, {
      apply: false,
      invitedStudentEmail: undefined,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("missing_invited_student_email_env");
      expect(result.message).toContain(DAT_SMOKE_INVITED_STUDENT_EMAIL_ENV);
    }
    expect(mocks.organizationFindMany).not.toHaveBeenCalled();
  });

  it("refuses missing / ambiguous smoke org and unexpected additional orgs", async () => {
    const { db, mocks } = makeDb();

    mocks.organizationFindMany.mockResolvedValueOnce([]);
    await expect(
      repairAcceptedStudentInvitationLink(db, {
        apply: false,
        invitedStudentEmail: EMAIL,
      }),
    ).resolves.toMatchObject({ ok: false, code: "smoke_organization_missing" });

    mocks.organizationFindMany.mockResolvedValueOnce([
      { id: ORG_ID, name: CANONICAL_SMOKE_ORGANIZATION_NAME },
      { id: "org2", name: CANONICAL_SMOKE_ORGANIZATION_NAME },
    ]);
    await expect(
      repairAcceptedStudentInvitationLink(db, {
        apply: false,
        invitedStudentEmail: EMAIL,
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "smoke_organization_ambiguous",
    });

    mocks.organizationFindMany.mockResolvedValueOnce([
      { id: ORG_ID, name: CANONICAL_SMOKE_ORGANIZATION_NAME },
    ]);
    mocks.organizationCount.mockResolvedValueOnce(1);
    await expect(
      repairAcceptedStudentInvitationLink(db, {
        apply: false,
        invitedStudentEmail: EMAIL,
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "unexpected_additional_organizations",
    });
  });

  it("refuses PENDING / REVOKED invitations and ACCEPTED without acceptedUserId", async () => {
    const { db, mocks } = makeDb();
    mocks.organizationFindMany.mockResolvedValue([
      { id: ORG_ID, name: CANONICAL_SMOKE_ORGANIZATION_NAME },
    ]);
    mocks.organizationCount.mockResolvedValue(0);

    mocks.invitationFindMany.mockResolvedValueOnce([
      {
        id: INV_ID,
        status: "PENDING",
        acceptedUserId: null,
        studentId: null,
        email: EMAIL,
        role: "STUDENT",
      },
    ]);
    await expect(
      repairAcceptedStudentInvitationLink(db, {
        apply: false,
        invitedStudentEmail: EMAIL,
      }),
    ).resolves.toMatchObject({ ok: false, code: "invitation_not_accepted" });

    mocks.invitationFindMany.mockResolvedValueOnce([
      {
        id: INV_ID,
        status: "REVOKED",
        acceptedUserId: null,
        studentId: null,
        email: EMAIL,
        role: "STUDENT",
      },
    ]);
    await expect(
      repairAcceptedStudentInvitationLink(db, {
        apply: false,
        invitedStudentEmail: EMAIL,
      }),
    ).resolves.toMatchObject({ ok: false, code: "invitation_not_accepted" });

    mocks.invitationFindMany.mockResolvedValueOnce([
      {
        id: INV_ID,
        status: "ACCEPTED",
        acceptedUserId: null,
        studentId: null,
        email: EMAIL,
        role: "STUDENT",
      },
    ]);
    await expect(
      repairAcceptedStudentInvitationLink(db, {
        apply: false,
        invitedStudentEmail: EMAIL,
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "invitation_missing_accepted_user",
    });
  });

  it("refuses ambiguous invitations / students and wrong role / category / access", async () => {
    const { db, mocks } = makeDb();
    mocks.organizationFindMany.mockResolvedValue([
      { id: ORG_ID, name: CANONICAL_SMOKE_ORGANIZATION_NAME },
    ]);
    mocks.organizationCount.mockResolvedValue(0);

    mocks.invitationFindMany.mockResolvedValueOnce([
      {
        id: INV_ID,
        status: "ACCEPTED",
        acceptedUserId: USER_ID,
        studentId: null,
        email: EMAIL,
        role: "STUDENT",
      },
      {
        id: "inv2",
        status: "ACCEPTED",
        acceptedUserId: USER_ID,
        studentId: null,
        email: EMAIL,
        role: "STUDENT",
      },
    ]);
    await expect(
      repairAcceptedStudentInvitationLink(db, {
        apply: false,
        invitedStudentEmail: EMAIL,
      }),
    ).resolves.toMatchObject({ ok: false, code: "invitation_ambiguous" });

    seedHappyPath(mocks);
    mocks.userFindMany.mockResolvedValueOnce([
      {
        id: USER_ID,
        email: EMAIL,
        role: "INSTRUCTOR",
        organizationId: ORG_ID,
      },
    ]);
    await expect(
      repairAcceptedStudentInvitationLink(db, {
        apply: false,
        invitedStudentEmail: EMAIL,
      }),
    ).resolves.toMatchObject({ ok: false, code: "user_role_mismatch" });

    seedHappyPath(mocks);
    mocks.studentFindMany.mockResolvedValueOnce([
      {
        id: STUDENT_ID,
        userId: USER_ID,
        organizationId: ORG_ID,
        appAccessMode: "APP_USER",
        category: { name: "C+E" },
      },
    ]);
    await expect(
      repairAcceptedStudentInvitationLink(db, {
        apply: false,
        invitedStudentEmail: EMAIL,
      }),
    ).resolves.toMatchObject({ ok: false, code: "student_category_not_b" });

    seedHappyPath(mocks);
    mocks.studentFindMany.mockResolvedValueOnce([
      {
        id: STUDENT_ID,
        userId: USER_ID,
        organizationId: ORG_ID,
        appAccessMode: "MANUAL_ONLY",
        category: { name: "B" },
      },
    ]);
    await expect(
      repairAcceptedStudentInvitationLink(db, {
        apply: false,
        invitedStudentEmail: EMAIL,
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "student_app_access_not_app_user",
    });

    seedHappyPath(mocks);
    mocks.studentFindMany.mockResolvedValueOnce([
      {
        id: STUDENT_ID,
        userId: USER_ID,
        organizationId: ORG_ID,
        appAccessMode: "APP_USER",
        category: { name: "B" },
      },
      {
        id: "stu2",
        userId: USER_ID,
        organizationId: ORG_ID,
        appAccessMode: "APP_USER",
        category: { name: "B" },
      },
    ]);
    await expect(
      repairAcceptedStudentInvitationLink(db, {
        apply: false,
        invitedStudentEmail: EMAIL,
      }),
    ).resolves.toMatchObject({ ok: false, code: "student_ambiguous" });
  });

  it("refuses user email mismatch", async () => {
    const { db, mocks } = makeDb();
    seedHappyPath(mocks);
    mocks.userFindMany.mockResolvedValue([
      {
        id: USER_ID,
        email: "other@example.test",
        role: "STUDENT",
        organizationId: ORG_ID,
      },
    ]);
    await expect(
      repairAcceptedStudentInvitationLink(db, {
        apply: false,
        invitedStudentEmail: EMAIL,
      }),
    ).resolves.toMatchObject({ ok: false, code: "user_email_mismatch" });
  });

  it("dry-run plans a write without calling update or audit", async () => {
    const { db, mocks } = makeDb();
    seedHappyPath(mocks);

    const result = await repairAcceptedStudentInvitationLink(db, {
      apply: false,
      invitedStudentEmail: EMAIL,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.applied).toBe(false);
      expect(result.wrote).toBe(false);
      expect(result.plan.wouldWrite).toBe(true);
      expect(result.plan.alreadyLinked).toBe(false);
      const text = formatRepairAcceptedStudentInvitationLinkPlanText(
        result.plan,
      );
      expect(text).not.toContain(EMAIL);
      expect(text).toContain("i***@example.test");
      expect(text).not.toContain(ORG_ID);
      expect(text).not.toContain(INV_ID);
      expect(text).not.toContain(USER_ID);
      expect(text).not.toContain(STUDENT_ID);
    }
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.invitationUpdate).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it("apply updates only studentId and writes audit", async () => {
    const { db, mocks } = makeDb();
    seedHappyPath(mocks);

    const result = await repairAcceptedStudentInvitationLink(db, {
      apply: true,
      invitedStudentEmail: EMAIL,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.applied).toBe(true);
      expect(result.wrote).toBe(true);
    }
    expect(mocks.invitationUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.invitationUpdate).toHaveBeenCalledWith({
      where: { id: INV_ID },
      data: { studentId: STUDENT_ID },
    });
    expect(mocks.auditCreate).toHaveBeenCalledTimes(1);
    const auditData = mocks.auditCreate.mock.calls[0]?.[0]?.data;
    expect(auditData).toMatchObject(
      buildAuditLogCreateData({
        organizationId: ORG_ID,
        actorUserId: USER_ID,
        actorRole: "STUDENT",
        actorEmail: null,
        action: REPAIR_ACCEPTED_STUDENT_INVITATION_LINK_AUDIT_ACTION,
        entityType: "UserInvitation",
        entityId: INV_ID,
        targetUserId: USER_ID,
        metadata: {
          repaired: true,
          alreadyLinked: false,
          mode: "apply",
          invitationRole: "STUDENT",
          invitationStatus: "ACCEPTED",
          studentLinkSource: "accepted_user_profile",
        },
        status: "SUCCESS",
      }),
    );
    const payload = JSON.stringify(mocks.auditCreate.mock.calls[0]);
    expect(payload).not.toContain(EMAIL);
  });

  it("is idempotent when already linked (dry-run and apply are no-ops)", async () => {
    const { db, mocks } = makeDb();
    seedHappyPath(mocks);
    mocks.invitationFindMany.mockResolvedValue([
      {
        id: INV_ID,
        status: "ACCEPTED",
        acceptedUserId: USER_ID,
        studentId: STUDENT_ID,
        email: EMAIL,
        role: "STUDENT",
      },
    ]);

    const dry = await repairAcceptedStudentInvitationLink(db, {
      apply: false,
      invitedStudentEmail: EMAIL,
    });
    expect(dry.ok).toBe(true);
    if (dry.ok) {
      expect(dry.plan.alreadyLinked).toBe(true);
      expect(dry.plan.wouldWrite).toBe(false);
      expect(dry.wrote).toBe(false);
    }

    const apply = await repairAcceptedStudentInvitationLink(db, {
      apply: true,
      invitedStudentEmail: EMAIL,
    });
    expect(apply.ok).toBe(true);
    if (apply.ok) {
      expect(apply.applied).toBe(false);
      expect(apply.wrote).toBe(false);
    }
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.invitationUpdate).not.toHaveBeenCalled();
  });

  it("refuses conflicting existing studentId and surfaces apply rollback", async () => {
    const { db, mocks } = makeDb();
    seedHappyPath(mocks);
    mocks.invitationFindMany.mockResolvedValue([
      {
        id: INV_ID,
        status: "ACCEPTED",
        acceptedUserId: USER_ID,
        studentId: "otherstudentxxxx",
        email: EMAIL,
        role: "STUDENT",
      },
    ]);
    await expect(
      repairAcceptedStudentInvitationLink(db, {
        apply: false,
        invitedStudentEmail: EMAIL,
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "invitation_student_id_conflict",
    });

    seedHappyPath(mocks);
    mocks.transaction.mockRejectedValueOnce(new Error("boom"));
    await expect(
      repairAcceptedStudentInvitationLink(db, {
        apply: true,
        invitedStudentEmail: EMAIL,
      }),
    ).resolves.toMatchObject({ ok: false, code: "apply_failed" });
  });
});
