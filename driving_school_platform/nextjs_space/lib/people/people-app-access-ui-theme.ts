/**
 * Shared Edit People → App access collapsible styling.
 * Matches Students `renderAppAccessSection` (blue) in student-records-manager.
 */
export const PEOPLE_APP_ACCESS_SECTION_THEME = {
  containerClass: "rounded-lg border border-blue-100 bg-blue-50/60",
  triggerTitleClass: "font-medium text-blue-900",
  triggerIconClass: "h-4 w-4 text-blue-700",
  bodyTextClass: "text-sm text-blue-800",
  labelTextClass: "text-sm text-blue-900",
  mutedTextClass: "text-xs text-blue-700",
} as const;

/** Vehicles Active/Inactive row badge variants (vehicles-management-client). */
export const PEOPLE_OPERATIONAL_ACTIVE_BADGE = {
  label: "Active",
  variant: "default" as const,
};

export const PEOPLE_OPERATIONAL_INACTIVE_BADGE = {
  label: "Inactive",
  variant: "secondary" as const,
};
