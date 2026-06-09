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
  {
    label: "Active app access / App access pending approval",
    description:
      "Compact app-access status for students with a linked login (shown instead of generic App access on APP_USER rows).",
  },
  {
    label: "Automatic / Manual (transmission)",
    description:
      "Transmission type on the student profile (school operational data), when set in Edit Student → Student profile.",
  },
  {
    label: "Category B",
    description:
      "License category on the student profile (one category per profile), when set in Edit Student → Student profile.",
  },
  {
    label: "No app access yet",
    description:
      "Manual profile without app login — shown in Edit Student → App access; use Send invitation when ready.",
  },
] as const;

const INSTRUCTOR_ENTRIES = [
  {
    label: "Instructor",
    description: "Operational instructor profile tied to an app login account.",
  },
  {
    label: "Pending invite (Onboarding)",
    description:
      "Invitation sent before an instructor profile exists — managed on Instructors → Onboarding, not on Profiles.",
  },
  {
    label: "App access pending approval",
    description:
      "Profile exists after invite acceptance (or admin creation awaiting approval) — account not approved to sign in yet. Shown on Profiles, not Onboarding.",
  },
  {
    label: "Active",
    description:
      "Approved and available for booking; can sign in (same blue primary badge as Vehicles Active).",
  },
  {
    label: "Inactive",
    description:
      "Deactivated — not available for booking; login disabled (same muted secondary badge as Vehicles Inactive). History preserved.",
  },
  {
    label: "App account linked / awaiting approval / inactive",
    description:
      "Row subtitle under the email: linked when active; awaiting approval when not yet approved; inactive when deactivated.",
  },
  {
    label: "Edit Instructor",
    description:
      "Primary row action — opens unified editor (Instructor profile + App access). Deactivate and Reactivate live under App access.",
  },
  {
    label: "Delete",
    description:
      "Visible on the row when zero-dependency hard delete is allowed by policy.",
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
