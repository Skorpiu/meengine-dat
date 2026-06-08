import { describe, it, expect } from "vitest";
import {
  PEOPLE_APP_ACCESS_SECTION_THEME,
  PEOPLE_OPERATIONAL_ACTIVE_BADGE,
  PEOPLE_OPERATIONAL_INACTIVE_BADGE,
} from "./people-app-access-ui-theme";

describe("people-app-access-ui-theme", () => {
  it("defines blue App access section matching Students editor", () => {
    expect(PEOPLE_APP_ACCESS_SECTION_THEME.containerClass).toContain("blue");
  });

  it("Active/Inactive badges match Vehicles operational semantics", () => {
    expect(PEOPLE_OPERATIONAL_ACTIVE_BADGE).toEqual({
      label: "Active",
      variant: "default",
    });
    expect(PEOPLE_OPERATIONAL_INACTIVE_BADGE).toEqual({
      label: "Inactive",
      variant: "secondary",
    });
  });
});
