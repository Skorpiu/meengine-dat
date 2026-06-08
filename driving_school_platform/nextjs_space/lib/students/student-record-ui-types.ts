import type { InvitationDto } from "@/lib/invitations/invitation-dto";
import type { InvitationEmailDeliveryDto } from "@/lib/invitations/invitation-ui-types";

export type StudentAppAccessMode = "MANUAL_ONLY" | "INVITED" | "APP_USER";

/** Safe pending invitation summary on student record list (no token or link). */
export type StudentRecordPendingInvitationDto = {
  invitationId: string;
  email: string;
  expiresAt: string;
  status: "PENDING";
};

export type StudentRecordDto = {
  id: string;
  userId: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phoneNumber: string | null;
  schoolStudentId: string | null;
  schoolStudentYearSuffix: string | null;
  schoolStudentSequence: number | null;
  schoolStudentIdSource: string | null;
  enrollmentDate: string | null;
  appAccessMode: StudentAppAccessMode;
  category: { id: number; name: string } | null;
  transmissionType: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  pendingInvitation: StudentRecordPendingInvitationDto | null;
};

export type StudentRecordsListResponse = {
  success: true;
  data: {
    students: StudentRecordDto[];
    nextCursor: string | null;
  };
};

export type StudentRecordMutationResponse = {
  success: true;
  data: {
    student: StudentRecordDto;
  };
};

export type StudentRecordApiError = {
  error?: string;
  code?: string;
  details?: Record<string, string>;
  statusCode?: number;
};

export type StudentRecordInviteResponse = {
  success: true;
  data: {
    invitation: InvitationDto;
    inviteLink: string;
    emailDelivery: InvitationEmailDeliveryDto;
  };
};
