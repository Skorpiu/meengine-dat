import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createPostmarkEmailProvider,
  DEFAULT_POSTMARK_API_BASE_URL,
  mapPostmarkHttpStatusToErrorCode,
  readPostmarkConfigFromEnv,
} from "./postmark-provider";
import type { SendEmailInput } from "../types";

const sampleInput: SendEmailInput = {
  to: "student@school.test",
  subject: "Invitation",
  html: "<p>Hello</p>",
  text: "Hello",
  replyTo: "admin@school.test",
  tags: ["invitation"],
};

const testConfig = {
  serverToken: "server-token-secret",
  fromEmail: "invites@example.test",
  messageStream: "outbound",
  apiBaseUrl: "https://postmark.test.local",
};

function mockFetchJson(
  status: number,
  body: unknown,
  init?: { reject?: boolean },
): void {
  if (init?.reject) {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );
    return;
  }

  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    }),
  );
}

describe("postmark provider", () => {
  const envSnapshot: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of [
      "POSTMARK_SERVER_TOKEN",
      "POSTMARK_FROM_EMAIL",
      "POSTMARK_MESSAGE_STREAM",
      "POSTMARK_API_BASE_URL",
    ]) {
      envSnapshot[key] = process.env[key];
    }
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const [key, value] of Object.entries(envSnapshot)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("readPostmarkConfigFromEnv uses production API base when POSTMARK_API_BASE_URL is unset", () => {
    process.env.POSTMARK_SERVER_TOKEN = "tok";
    process.env.POSTMARK_FROM_EMAIL = "invites@example.test";
    delete process.env.POSTMARK_API_BASE_URL;

    expect(readPostmarkConfigFromEnv()?.apiBaseUrl).toBe(
      DEFAULT_POSTMARK_API_BASE_URL,
    );
  });

  it("readPostmarkConfigFromEnv returns null when token or from is missing", () => {
    delete process.env.POSTMARK_SERVER_TOKEN;
    process.env.POSTMARK_FROM_EMAIL = "a@b.test";
    expect(readPostmarkConfigFromEnv()).toBeNull();

    process.env.POSTMARK_SERVER_TOKEN = "tok";
    delete process.env.POSTMARK_FROM_EMAIL;
    expect(readPostmarkConfigFromEnv()).toBeNull();
  });

  it("returns PROVIDER_MISCONFIGURED without fetch when env is incomplete", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    delete process.env.POSTMARK_SERVER_TOKEN;
    delete process.env.POSTMARK_FROM_EMAIL;

    const provider = createPostmarkEmailProvider();
    const result = await provider.send(sampleInput);

    expect(result).toEqual({
      ok: false,
      provider: "postmark",
      errorCode: "PROVIDER_MISCONFIGURED",
      message: "Postmark is not configured for this deployment.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns PROVIDER_MISCONFIGURED without fetch when from email is missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const provider = createPostmarkEmailProvider({
      serverToken: "tok",
      fromEmail: "",
      messageStream: "outbound",
      apiBaseUrl: testConfig.apiBaseUrl,
    });
    const result = await provider.send(sampleInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("PROVIDER_MISCONFIGURED");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns INVALID_EMAIL_INPUT when html and text are empty", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const provider = createPostmarkEmailProvider(testConfig);
    const result = await provider.send({
      ...sampleInput,
      html: "  ",
      text: "",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("INVALID_EMAIL_INPUT");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns ok true with MessageID on 2xx", async () => {
    mockFetchJson(200, { MessageID: "pm-msg-123", ErrorCode: 0 });

    const provider = createPostmarkEmailProvider(testConfig);
    const result = await provider.send(sampleInput);

    expect(result).toEqual({
      ok: true,
      provider: "postmark",
      id: "pm-msg-123",
    });
    expect(JSON.stringify(result)).not.toContain("server-token-secret");
    expect(JSON.stringify(result)).not.toContain("<p>Hello</p>");
  });

  it("sends expected JSON payload with default MessageStream", async () => {
    mockFetchJson(200, { MessageID: "pm-1" });

    const provider = createPostmarkEmailProvider(testConfig);
    await provider.send(sampleInput);

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith(
      "https://postmark.test.local/email",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-Postmark-Server-Token": "server-token-secret",
        }),
      }),
    );

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(init.body)) as Record<string, string>;

    expect(body).toEqual({
      From: "invites@example.test",
      To: "student@school.test",
      Subject: "Invitation",
      HtmlBody: "<p>Hello</p>",
      TextBody: "Hello",
      ReplyTo: "admin@school.test",
      Tag: "invitation",
      MessageStream: "outbound",
    });
    expect(JSON.stringify(body)).not.toContain("server-token-secret");
  });

  it("uses POSTMARK_MESSAGE_STREAM when set in config", async () => {
    mockFetchJson(200, { MessageID: "pm-2" });

    const provider = createPostmarkEmailProvider({
      ...testConfig,
      messageStream: "transactional-stream",
    });
    await provider.send(sampleInput);

    const init = (fetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(init.body)) as Record<string, string>;
    expect(body.MessageStream).toBe("transactional-stream");
  });

  it.each([
    [401, "PROVIDER_AUTH_FAILED"],
    [422, "EMAIL_REJECTED"],
    [429, "PROVIDER_RATE_LIMITED"],
    [500, "PROVIDER_TEMPORARY_FAILURE"],
    [503, "PROVIDER_TEMPORARY_FAILURE"],
    [418, "PROVIDER_SEND_FAILED"],
  ] as const)(
    "maps HTTP %i to %s without raw Postmark body",
    async (status, errorCode) => {
      mockFetchJson(status, {
        Message: "Detailed Postmark error with secret-token",
        ErrorCode: 999,
      });

      const provider = createPostmarkEmailProvider(testConfig);
      const result = await provider.send(sampleInput);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errorCode).toBe(errorCode);
        expect(result.message).not.toContain("Detailed Postmark");
        expect(result.message).not.toContain("secret-token");
      }
      expect(JSON.stringify(result)).not.toContain("Detailed Postmark");
    },
  );

  it("maps fetch rejection to PROVIDER_TEMPORARY_FAILURE without throwing", async () => {
    mockFetchJson(0, {}, { reject: true });

    const provider = createPostmarkEmailProvider(testConfig);
    const result = await provider.send(sampleInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("PROVIDER_TEMPORARY_FAILURE");
      expect(result.message).not.toContain("network down");
    }
  });
});

describe("mapPostmarkHttpStatusToErrorCode", () => {
  it("maps known status codes", () => {
    expect(mapPostmarkHttpStatusToErrorCode(401)).toBe("PROVIDER_AUTH_FAILED");
    expect(mapPostmarkHttpStatusToErrorCode(422)).toBe("EMAIL_REJECTED");
    expect(mapPostmarkHttpStatusToErrorCode(429)).toBe("PROVIDER_RATE_LIMITED");
    expect(mapPostmarkHttpStatusToErrorCode(502)).toBe(
      "PROVIDER_TEMPORARY_FAILURE",
    );
    expect(mapPostmarkHttpStatusToErrorCode(400)).toBe("PROVIDER_SEND_FAILED");
  });
});
