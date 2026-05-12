import { describe, it, expect } from "vitest";

import { GET } from "./route";

describe("GET /api/health", () => {
  it("returns 200 with a stable JSON body", async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const body: unknown = await res.json();
    expect(body).toEqual({
      ok: true,
      service: "driving-academy-tool",
      status: "healthy",
    });

    const cacheControl = res.headers.get("cache-control");
    expect(cacheControl).toBe("no-store, max-age=0");
  });
});
