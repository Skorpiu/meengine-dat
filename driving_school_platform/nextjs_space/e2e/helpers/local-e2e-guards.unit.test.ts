import { describe, expect, it } from "vitest";

import {
  E2E_APP_BASE_URL,
  E2E_ORCHESTRATOR_ACTIVE_VALUE,
} from "@/lib/ops/e2e-database-contract";
import {
  evaluateLocalBrowserE2eGuard,
  readLocalBrowserE2eGuardInput,
} from "./local-e2e-guards";

const ALLOWED_INPUT = {
  orchestratorActive: E2E_ORCHESTRATOR_ACTIVE_VALUE,
  baseUrl: E2E_APP_BASE_URL,
  allowProduction: undefined,
  allowProductionMutations: undefined,
  smokeBaseUrl: undefined,
};

describe("local-e2e-guards allow", () => {
  it("allows the exact orchestrator marker and loopback app URL", () => {
    const decision = evaluateLocalBrowserE2eGuard(ALLOWED_INPUT);
    expect(decision.ok).toBe(true);
    if (decision.ok) {
      expect(decision.baseUrl).toBe(E2E_APP_BASE_URL);
    }
  });
});

describe("local-e2e-guards refusals", () => {
  it("refuses a missing orchestrator marker", () => {
    const decision = evaluateLocalBrowserE2eGuard({
      ...ALLOWED_INPUT,
      orchestratorActive: undefined,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("missing_orchestrator_marker");
    }
  });

  it("refuses localhost aliases", () => {
    const decision = evaluateLocalBrowserE2eGuard({
      ...ALLOWED_INPUT,
      baseUrl: "http://localhost:13000",
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("localhost_alias");
    }
  });

  it("refuses a hosted Production hostname", () => {
    const decision = evaluateLocalBrowserE2eGuard({
      ...ALLOWED_INPUT,
      baseUrl: "https://www.meengine.io",
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("unsupported_base_url_protocol");
    }
  });

  it("refuses a public http hostname", () => {
    const decision = evaluateLocalBrowserE2eGuard({
      ...ALLOWED_INPUT,
      baseUrl: "http://www.meengine.io:13000",
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("hosted_or_public_hostname");
    }
  });

  it("refuses a Supabase hostname", () => {
    const decision = evaluateLocalBrowserE2eGuard({
      ...ALLOWED_INPUT,
      baseUrl: "http://db.projref.supabase.co:13000",
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("supabase_hostname");
    }
  });

  it("refuses Production smoke opt-in context", () => {
    const decision = evaluateLocalBrowserE2eGuard({
      ...ALLOWED_INPUT,
      allowProduction: "true",
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("production_opt_in_context");
    }
  });

  it("refuses Production smoke mutation context", () => {
    const decision = evaluateLocalBrowserE2eGuard({
      ...ALLOWED_INPUT,
      allowProductionMutations: "true",
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("smoke_mutation_context");
    }
  });

  it("refuses a smoke base URL in the local path", () => {
    const decision = evaluateLocalBrowserE2eGuard({
      ...ALLOWED_INPUT,
      smokeBaseUrl: "https://www.meengine.io",
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("smoke_base_url_context");
    }
  });

  it("refuses the wrong loopback app port", () => {
    const decision = evaluateLocalBrowserE2eGuard({
      ...ALLOWED_INPUT,
      baseUrl: "http://127.0.0.1:3000",
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("wrong_app_port");
    }
  });
});

describe("readLocalBrowserE2eGuardInput", () => {
  it("reads orchestrator and smoke context keys from env", () => {
    const input = readLocalBrowserE2eGuardInput({
      DAT_E2E_ORCHESTRATOR_ACTIVE: "1",
      DAT_E2E_BASE_URL: E2E_APP_BASE_URL,
      DAT_E2E_ALLOW_PRODUCTION: "true",
      DAT_SMOKE_BASE_URL: "https://www.meengine.io",
    });
    expect(input.orchestratorActive).toBe("1");
    expect(input.baseUrl).toBe(E2E_APP_BASE_URL);
    expect(input.allowProduction).toBe("true");
    expect(input.smokeBaseUrl).toBe("https://www.meengine.io");
  });
});
