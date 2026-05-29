import type { InvitationDto } from "@/lib/invitations/invitation-dto";
import type { InvitationEmailDeliveryDto } from "@/lib/invitations/invitation-ui-types";

export type StudentAppAccessMode = "MANUAL_ONLY" | "INVITED" | "APP_USER";

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
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
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
