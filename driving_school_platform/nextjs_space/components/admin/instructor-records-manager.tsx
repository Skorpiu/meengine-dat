"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Edit2, Search, UserCog } from "lucide-react";
import type { InstructorRecordUserDto } from "@/lib/instructors/instructor-record-ui-types";
import {
  filterInstructorRecordUsersBySearch,
  formatInstructorLicenseExpiry,
  getInstructorAppAccountStatusLabel,
  getInstructorRecordDisplayName,
  hasOperationalInstructorRecord,
} from "@/lib/instructors/instructor-record-ui-utils";
import { PeopleProfileLabelGuide } from "@/components/admin/people-profile-label-guide";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const INSTRUCTOR_PAGE_SIZE = 15;

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
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(INSTRUCTOR_PAGE_SIZE);

  const filteredInstructors = useMemo(
    () => filterInstructorRecordUsersBySearch(users, appliedSearch),
    [users, appliedSearch],
  );

  const visibleInstructors = useMemo(
    () => filteredInstructors.slice(0, visibleCount),
    [filteredInstructors, visibleCount],
  );

  const hasMore = visibleCount < filteredInstructors.length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchInput.trim());
    setVisibleCount(INSTRUCTOR_PAGE_SIZE);
  };

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
          Instructor profiles — search by name, email, or license number. Add
          new instructors under <strong>Onboarding</strong>.
        </p>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Instructor profiles</CardTitle>
            <form
              onSubmit={handleSearch}
              className="flex w-full sm:w-auto gap-2"
            >
              <Input
                placeholder="Name, email, or license number"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="sm:min-w-[280px]"
              />
              <Button type="submit" variant="outline">
                <Search className="h-4 w-4" />
              </Button>
            </form>
          </div>
          <PeopleProfileLabelGuide variant="instructor" />
        </CardHeader>
        <CardContent>
          {filteredInstructors.length === 0 ? (
            <p className="text-sm text-gray-500">
              {appliedSearch
                ? "No instructor profiles found for this search."
                : "No instructors registered yet. Add an instructor under Onboarding."}
            </p>
          ) : (
            <>
              <TooltipProvider delayDuration={300}>
                <div className="space-y-3">
                  {visibleInstructors.map((user) => {
                    const hasRecord = hasOperationalInstructorRecord(user);
                    const appAccessLabel = getInstructorAppAccountStatusLabel(
                      user.isApproved,
                    );
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
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline">Instructor</Badge>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                Operational instructor profile linked to an app
                                login account.
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant={
                                    user.isApproved ? "secondary" : "default"
                                  }
                                >
                                  {appAccessLabel}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                {user.isApproved
                                  ? "Instructor can sign in (account approved)."
                                  : "Account exists but is not approved yet."}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <div className="text-sm text-gray-600">
                            {user.email}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.phoneNumber || "No phone"} · App account
                            linked
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
              </TooltipProvider>

              {hasMore ? (
                <div className="mt-4 flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setVisibleCount((n) => n + INSTRUCTOR_PAGE_SIZE)
                    }
                  >
                    Load more
                  </Button>
                </div>
              ) : null}

              <p className="text-xs text-gray-400 mt-4 text-center">
                Showing {visibleInstructors.length} of{" "}
                {filteredInstructors.length} instructor profile
                {filteredInstructors.length === 1 ? "" : "s"}
                {appliedSearch ? " (search active)" : ""}.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
