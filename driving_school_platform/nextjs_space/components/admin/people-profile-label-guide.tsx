"use client";

import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export type PeopleProfileLabelGuideVariant = "student" | "instructor";

type PeopleProfileLabelGuideProps = {
  variant: PeopleProfileLabelGuideVariant;
};

const STUDENT_ENTRIES = [
  {
    label: "Manual profile / Imported profile / System profile",
    description:
      "How the operational student profile was created (manual entry, import, or system/legacy).",
  },
  {
    label: "No app access",
    description: "No app login linked yet.",
  },
  {
    label: "Pending invite",
    description:
      "An active invitation exists for this profile (revoke or resend from the row when shown).",
  },
  {
    label: "Invite pending",
    description:
      "Profile is marked invite-pending but no active invitation was found — check Onboarding.",
  },
  {
    label: "App access",
    description: "Linked to an app login account.",
  },
] as const;

const INSTRUCTOR_ENTRIES = [
  {
    label: "Instructor",
    description: "Operational instructor profile tied to an app login account.",
  },
  {
    label: "App access active",
    description: "Instructor can sign in (account approved).",
  },
  {
    label: "App access pending approval",
    description: "Account exists but is not approved yet.",
  },
] as const;

export function PeopleProfileLabelGuide({
  variant,
}: PeopleProfileLabelGuideProps) {
  const entries = variant === "student" ? STUDENT_ENTRIES : INSTRUCTOR_ENTRIES;

  return (
    <Collapsible className="rounded-md border bg-muted/30 px-3 py-2">
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 text-left text-sm font-medium text-gray-800 hover:text-gray-900">
        <span>Profile labels guide</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3 space-y-2 text-sm text-gray-600">
        {entries.map((entry) => (
          <div key={entry.label}>
            <span className="font-medium text-gray-800">{entry.label}</span>
            <span className="text-gray-600"> — {entry.description}</span>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
