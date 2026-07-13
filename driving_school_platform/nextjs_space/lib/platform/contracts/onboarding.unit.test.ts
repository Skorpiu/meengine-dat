import { describe, it, expect } from "vitest";
import { platformOnboardOrganizationServerSchema } from "./onboarding";
import { toPlatformOrganizationsPostResponse } from "./organizations-response";

describe("platformOnboardOrganizationServerSchema", () => {
  it("parses schoolAdmin* request fields", () => {
    const parsed = platformOnboardOrganizationServerSchema.safeParse({
      name: "Example School",
      hosts: ["school.example.com"],
      primaryHost: "school.example.com",
      schoolAdminEmail: "admin@school.example.com",
      schoolAdminPassword: "password123",
      schoolAdminFirstName: "Ada",
      schoolAdminLastName: "Admin",
      licenseFeatureKeys: ["LESSON_MANAGEMENT"],
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.schoolAdminEmail).toBe("admin@school.example.com");
      expect(parsed.data.schoolAdminFirstName).toBe("Ada");
    }
  });

  it("rejects legacy superAdmin* fields", () => {
    const parsed = platformOnboardOrganizationServerSchema.safeParse({
      name: "Example School",
      hosts: ["school.example.com"],
      primaryHost: "school.example.com",
      superAdminEmail: "admin@school.example.com",
      superAdminPassword: "password123",
      superAdminFirstName: "Ada",
      superAdminLastName: "Admin",
      licenseFeatureKeys: ["LESSON_MANAGEMENT"],
    });

    expect(parsed.success).toBe(false);
  });
});

describe("toPlatformOrganizationsPostResponse", () => {
  it("returns schoolAdmin in the post response contract", () => {
    const response = toPlatformOrganizationsPostResponse({
      organizationId: "org-1",
      primaryHost: "school.example.com",
      hosts: ["school.example.com"],
      schoolAdmin: {
        id: "user-1",
        email: "admin@school.example.com",
        firstName: "Ada",
        lastName: "Admin",
        role: "SUPER_ADMIN",
      },
      licenseKey: "license-key",
    });

    expect(response.schoolAdmin).toEqual({
      id: "user-1",
      email: "admin@school.example.com",
      firstName: "Ada",
      lastName: "Admin",
      role: "SUPER_ADMIN",
    });
    expect("superAdmin" in response).toBe(false);
  });
});
