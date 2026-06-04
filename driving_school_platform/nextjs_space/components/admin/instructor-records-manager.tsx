"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Edit2, UserCog } from "lucide-react";
import type { InstructorRecordUserDto } from "@/lib/instructors/instructor-record-ui-types";
import {
  filterInstructorRecordUsers,
  formatInstructorLicenseExpiry,
  getInstructorAppAccountStatusLabel,
  getInstructorRecordDisplayName,
  hasOperationalInstructorRecord,
} from "@/lib/instructors/instructor-record-ui-utils";

type InstructorRecordsManagerProps = {
  users: InstructorRecordUserDto[];
  onEditAppAccount: (user: InstructorRecordUserDto) => void;
  embedded?: boolean;
};

export function InstructorRecordsManager({
  users,
  onEditAppAccount,
  embedded = false,
}: InstructorRecordsManagerProps) {
  const instructors = filterInstructorRecordUsers(users);

  return (
    <section className={embedded ? "space-y-6" : "mt-10 space-y-6"}>
      {!embedded ? (
        <div className="flex items-start gap-3">
          <UserCog className="h-8 w-8 text-driving-primary shrink-0 mt-1" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Instructors</h2>
            <p className="text-gray-600 mt-1 max-w-3xl">
              Instructor operational profiles are linked to app login accounts.
              Each instructor has a User account and an Instructor record with
              license details. To grant access for a new instructor, use the{" "}
              <strong>Onboarding</strong> tab.
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-600 max-w-3xl">
          Registered instructors — license and app account status. Add new
          instructors under <strong>Onboarding</strong>.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Registered instructors</CardTitle>
        </CardHeader>
        <CardContent>
          {instructors.length === 0 ? (
            <p className="text-sm text-gray-500">
              No instructors registered yet. Add an instructor under{" "}
              <strong>Onboarding</strong>.
            </p>
          ) : (
            <div className="space-y-3">
              {instructors.map((user) => {
                const hasRecord = hasOperationalInstructorRecord(user);
                return (
                  <div
                    key={user.id}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {getInstructorRecordDisplayName(user)}
                        </span>
                        <Badge variant="outline">Instructor</Badge>
                        <Badge
                          variant={user.isApproved ? "secondary" : "default"}
                        >
                          {getInstructorAppAccountStatusLabel(user.isApproved)}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                      <div className="text-sm text-gray-500">
                        {user.phoneNumber || "No phone"} · App account linked
                      </div>
                      {hasRecord ? (
                        <div className="text-sm text-gray-600 space-y-0.5">
                          <div>
                            License:{" "}
                            <span className="font-mono">
                              {user.instructor?.instructorLicenseNumber}
                            </span>
                          </div>
                          <div>
                            License expires:{" "}
                            {formatInstructorLicenseExpiry(
                              user.instructor?.instructorLicenseExpiry,
                            )}
                          </div>
                          {user.instructor?.instructorIdNumber ? (
                            <div className="text-xs text-gray-500">
                              Instructor ID:{" "}
                              <span className="font-mono">
                                {user.instructor.instructorIdNumber}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <Alert variant="destructive" className="py-2">
                          <AlertDescription className="text-sm">
                            App account exists but no operational Instructor
                            record is linked. Use Edit app account to add
                            license details, or contact support if this
                            persists.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                    <div className="flex shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEditAppAccount(user)}
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Edit app account
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
