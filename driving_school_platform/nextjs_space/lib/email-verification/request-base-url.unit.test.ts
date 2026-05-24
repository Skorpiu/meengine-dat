import { describe, it, expect } from "vitest";
import type { NextRequest } from "next/server";
import { getEmailVerificationRequestBaseUrl } from "./request-base-url";

describe("getEmailVerificationRequestBaseUrl", () => {
  it("returns request origin without path or query", () => {
    const request = {
      url: "https://tenant.example.com/api/auth/email-verification/request?x=1",
    } as NextRequest;

    expect(getEmailVerificationRequestBaseUrl(request)).toBe(
      "https://tenant.example.com",
    );
  });
});
