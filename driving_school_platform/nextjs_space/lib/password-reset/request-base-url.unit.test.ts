import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { getPasswordResetRequestBaseUrl } from "./request-base-url";

describe("getPasswordResetRequestBaseUrl", () => {
  it("returns origin without path or query", () => {
    const request = new NextRequest(
      "https://tenant.example.com/api/auth/password-reset/request?x=1",
      { method: "POST" },
    );

    expect(getPasswordResetRequestBaseUrl(request)).toBe(
      "https://tenant.example.com",
    );
  });
});
