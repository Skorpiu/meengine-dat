"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { InvitationsManagementClient } from "@/components/admin/invitations-management-client";
import { InstructorAccountCreateForm } from "@/components/admin/instructor-account-create-form";
import { StudentManualRecordCreateForm } from "@/components/admin/student-manual-record-create-form";
import { StudentRecordsManager } from "@/components/admin/student-records-manager";
import { InstructorRecordsManager } from "@/components/admin/instructor-records-manager";
import {
  ADVANCED_ACCOUNTS_SECTION,
  PEOPLE_L1_TAB_LABELS,
  PEOPLE_L1_TAB_VALUES,
  PEOPLE_PAGE_HEADER_DESCRIPTION,
  getAppAccountApprovalLabel,
  getAppAccountLinkLabel,
  getAppAccountLinkStatus,
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

type InstructorInfo = {
  id?: string;
  instructorIdNumber?: string | null;
  instructorLicenseNumber?: string | null;
  instructorLicenseExpiry?: string | Date | null;
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
  instructor?: InstructorInfo | null;
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
  const instructorAccounts = users.filter((u) => u.role === "INSTRUCTOR");
  const studentAccounts = users.filter((u) => u.role === "STUDENT");

  const renderReadOnlyAccountRow = (user: User) => {
    const linkStatus = getAppAccountLinkStatus(user);

    return (
      <div
        key={user.id}
        className="flex items-center justify-between p-4 border rounded-lg bg-white"
      >
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-driving-primary text-white flex items-center justify-center font-medium">
            {user.firstName?.[0]}
            {user.lastName?.[0]}
          </div>
          <div>
            <div className="font-medium">
              {user.firstName} {user.lastName}
            </div>
            <div className="text-sm text-gray-600">{user.email}</div>
            <div className="text-sm text-gray-500">
              {user.phoneNumber || "No phone"} • {user.address || "No address"}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge variant={user.role === "INSTRUCTOR" ? "default" : "secondary"}>
            {user.role === "INSTRUCTOR" ? "Instructor" : "Student"}
          </Badge>
          <Badge variant={user.isApproved ? "secondary" : "outline"}>
            {getAppAccountApprovalLabel(user.isApproved)}
          </Badge>
          <Badge variant={linkStatus === "linked" ? "secondary" : "outline"}>
            {getAppAccountLinkLabel(linkStatus)}
          </Badge>
        </div>
      </div>
    );
  };

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

      <Collapsible
        defaultOpen={ADVANCED_ACCOUNTS_SECTION.defaultOpen}
        className="mt-10 rounded-lg border border-gray-200 bg-gray-50/40"
      >
        <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 px-4 py-4 text-left">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-gray-800">
              {ADVANCED_ACCOUNTS_SECTION.title}
            </h2>
            <p className="text-sm text-gray-600 font-normal max-w-3xl">
              {ADVANCED_ACCOUNTS_SECTION.description}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-gray-600 transition-transform group-data-[state=open]:rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-6 px-4 pb-4">
          <Card className="border-gray-200 bg-white">
            <CardHeader>
              <CardTitle className="text-base text-gray-800">
                App account diagnostics
              </CardTitle>
              <p className="text-sm text-gray-600 font-normal">
                Read-only view of login accounts. Create, edit, and access
                changes are managed from Students or Instructors.
              </p>
            </CardHeader>
            <CardContent className="space-y-8">
              {users.length === 0 ? (
                <p className="text-sm text-gray-500">No app accounts.</p>
              ) : (
                <>
                  {instructorAccounts.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-700">
                        Instructors
                      </h3>
                      <div className="space-y-4">
                        {instructorAccounts.map(renderReadOnlyAccountRow)}
                      </div>
                    </div>
                  )}
                  {studentAccounts.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-700">
                        Students (with app account)
                      </h3>
                      <div className="space-y-4">
                        {studentAccounts.map(renderReadOnlyAccountRow)}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}
