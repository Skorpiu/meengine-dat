"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvitationsManagementClient } from "@/components/admin/invitations-management-client";
import { InstructorAccountCreateForm } from "@/components/admin/instructor-account-create-form";
import { StudentManualRecordCreateForm } from "@/components/admin/student-manual-record-create-form";
import { StudentRecordsManager } from "@/components/admin/student-records-manager";
import { InstructorRecordsManager } from "@/components/admin/instructor-records-manager";
import {
  PEOPLE_L1_TAB_LABELS,
  PEOPLE_L1_TAB_VALUES,
  PEOPLE_PAGE_HEADER_DESCRIPTION,
} from "@/lib/people/people-management-ui";

type CategoryOption = {
  id: number;
  name: string;
};

type TransmissionTypeOption = {
  id: number;
  name: string;
};

type StudentInfo = {
  category?: { name: string } | null;
  transmissionType?: { name: string } | null;
};

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  address: string | null;
  role: string;
  isApproved: boolean;
  createdAt: Date;
  student?: StudentInfo | null;
  instructor?: {
    id?: string;
    instructorIdNumber?: string | null;
    instructorLicenseNumber?: string | null;
    instructorLicenseExpiry?: string | Date | null;
  } | null;
}

interface Props {
  users: User[];
  categories: CategoryOption[];
  transmissionTypes: TransmissionTypeOption[];
}

export function UsersManagementClient({
  users,
  categories,
  transmissionTypes,
}: Props) {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">People</h1>
        <p className="text-gray-600 mt-2 max-w-3xl">
          {PEOPLE_PAGE_HEADER_DESCRIPTION}
        </p>
      </div>

      <Tabs defaultValue="students" className="space-y-6">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          {PEOPLE_L1_TAB_VALUES.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {PEOPLE_L1_TAB_LABELS[tab]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="students" className="space-y-6">
          <Tabs defaultValue="profiles" className="space-y-6">
            <TabsList>
              <TabsTrigger value="profiles">Profiles</TabsTrigger>
              <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
            </TabsList>
            <TabsContent value="profiles">
              <StudentRecordsManager
                embedded
                categories={categories}
                transmissionTypes={transmissionTypes}
                getLinkedAppAccountDetails={(userId) => {
                  const fullUser = users.find((u) => u.id === userId);
                  if (!fullUser) return null;
                  return {
                    email: fullUser.email,
                    isApproved: fullUser.isApproved,
                    firstName: fullUser.firstName,
                    lastName: fullUser.lastName,
                    phoneNumber: fullUser.phoneNumber,
                    address: fullUser.address,
                    selectedCategories: fullUser.student?.category
                      ? [fullUser.student.category.name]
                      : [],
                    transmissionType:
                      fullUser.student?.transmissionType?.name ?? "",
                  };
                }}
              />
            </TabsContent>
            <TabsContent value="onboarding" className="space-y-6">
              <p className="text-sm text-gray-600 max-w-3xl">
                Add learners to the school: create a{" "}
                <strong>manual student profile</strong> when they exist
                operationally but do not need app access yet, or use{" "}
                <strong>pending invitations</strong> below when they should
                register via email. When a profile already exists, prefer{" "}
                <strong>Send invitation</strong> on the row in{" "}
                <strong>Profiles</strong> so the invite links to the correct
                profile.
              </p>
              <StudentManualRecordCreateForm />
              <InvitationsManagementClient
                roleFilter="STUDENT"
                defaultRole="STUDENT"
                embedded
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="instructors" className="space-y-6">
          <Tabs defaultValue="profiles" className="space-y-6">
            <TabsList>
              <TabsTrigger value="profiles">Profiles</TabsTrigger>
              <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
            </TabsList>
            <TabsContent value="profiles">
              <InstructorRecordsManager users={users} embedded />
            </TabsContent>
            <TabsContent value="onboarding" className="space-y-6">
              <p className="text-sm text-gray-600 max-w-3xl">
                Add instructors: <strong>New instructor</strong> creates an app
                login and operational profile with license details now. Use{" "}
                <strong>invitations</strong> when the instructor should register
                themselves via email instead.
              </p>
              <InstructorAccountCreateForm />
              <InvitationsManagementClient
                roleFilter="INSTRUCTOR"
                defaultRole="INSTRUCTOR"
                embedded
              />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </>
  );
}
