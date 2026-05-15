import { describe, it, expect } from "vitest";
import {
  BILLING_WEBHOOK_CODES,
  BILLING_WEBHOOK_GENERIC_ERROR,
  billingWebhookJsonError,
} from "./webhook-http";

describe("billingWebhookJsonError", () => {
  it("returns stable error shape without detail field", async () => {
    const res = billingWebhookJsonError(400, BILLING_WEBHOOK_CODES.parseFailed);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({
      error: BILLING_WEBHOOK_GENERIC_ERROR,
      code: BILLING_WEBHOOK_CODES.parseFailed,
    });
    expect(body).not.toHaveProperty("detail");
  });
});
