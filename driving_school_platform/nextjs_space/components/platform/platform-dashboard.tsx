"use client";

import { useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import {
  FEATURE_DEFINITIONS,
  type FeatureKey,
} from "@/lib/config/license-features";
import { platformOnboardOrganizationClientSchema } from "@/lib/platform/contracts/onboarding";
import type { PlatformOrganizationDto } from "@/lib/platform/contracts/organizations-response";

type Organization = PlatformOrganizationDto;

type FieldErrors = Record<string, string[]>;

export default function PlatformDashboard({
  initialOrganizations,
}: {
  initialOrganizations: Organization[];
}) {
  const [orgs, setOrgs] = useState<Organization[]>(initialOrganizations);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const featureList = useMemo(() => Object.values(FEATURE_DEFINITIONS), []);

  const [form, setForm] = useState({
    name: "",
    hosts: "",
    primaryHost: "",
    schoolAdminEmail: "",
    schoolAdminPassword: "",
    schoolAdminFirstName: "",
    schoolAdminLastName: "",
    licenseFeatureKeys: [] as FeatureKey[],
    licenseNotes: "",
    licenseExpiresAt: "",
  });

  async function refresh() {
    const res = await fetch("/api/platform/organizations");
    const data = await res.json();
    if (res.ok) setOrgs(data.organizations);
  }

  async function submit() {
    setError("");
    setFieldErrors({});
    setIsLoading(true);

    try {
      const clientCheck = platformOnboardOrganizationClientSchema.safeParse({
        name: form.name,
        hosts: form.hosts,
        primaryHost: form.primaryHost,
        schoolAdminEmail: form.schoolAdminEmail,
        schoolAdminPassword: form.schoolAdminPassword,
        schoolAdminFirstName: form.schoolAdminFirstName,
        schoolAdminLastName: form.schoolAdminLastName,
        licenseExpiresAt: form.licenseExpiresAt || undefined,
        licenseNotes: form.licenseNotes || undefined,
      });

      if (!clientCheck.success) {
        const flat = clientCheck.error.flatten();
        setFieldErrors(flat.fieldErrors as FieldErrors);
        setError("Corrige os campos assinalados.");
        return;
      }

      const payload = {
        ...form,
        hosts: form.hosts
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        primaryHost: form.primaryHost.trim(),
        licenseFeatureKeys: form.licenseFeatureKeys,
        licenseExpiresAt: form.licenseExpiresAt || undefined,
        licenseNotes: form.licenseNotes || undefined,
      };

      const res = await fetch("/api/platform/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? "Failed");

        const flat = data?.details;
        // suporte para zod flatten() do backend
        if (flat?.fieldErrors && typeof flat.fieldErrors === "object") {
          setFieldErrors(flat.fieldErrors as FieldErrors);
        }
        return;
      }

      await refresh();

      // reset minimal
      setForm((p) => ({
        ...p,
        name: "",
        hosts: "",
        primaryHost: "",
        schoolAdminEmail: "",
        schoolAdminPassword: "",
        schoolAdminFirstName: "",
        schoolAdminLastName: "",
        licenseFeatureKeys: [],
        licenseNotes: "",
        licenseExpiresAt: "",
      }));
    } finally {
      setIsLoading(false);
    }
  }

  function fieldError(name: string) {
    const msg = fieldErrors?.[name]?.[0];
    return msg ? <div className="text-sm text-red-700 mt-1">{msg}</div> : null;
  }

  function toggleFeature(key: FeatureKey) {
    setForm((p) => {
      const has = p.licenseFeatureKeys.includes(key);
      return {
        ...p,
        licenseFeatureKeys: has
          ? p.licenseFeatureKeys.filter((k) => k !== key)
          : [...p.licenseFeatureKeys, key],
      };
    });
  }

  async function handleSignOut() {
    await signOut({ callbackUrl: "/" });
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Platform</h1>
          <p className="text-gray-600">
            Onboard de organizações/domínios/licenças (PLATFORM_ADMIN).
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 self-start border border-gray-300 rounded px-4 py-2 text-gray-800 hover:bg-gray-50"
          onClick={handleSignOut}
        >
          Sign out
        </button>
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 text-red-800 p-3 rounded">
          {error}
        </div>
      )}

      <div className="border rounded p-4 space-y-4">
        <h2 className="font-semibold">Criar organização</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <input
              className="border rounded p-2 w-full"
              placeholder="Nome *"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
            {fieldError("name")}
          </div>
          <div>
            <input
              className="border rounded p-2 w-full"
              placeholder="Hosts (csv) ex: school-a.meengine.io, school-a.vercel.app"
              value={form.hosts}
              onChange={(e) =>
                setForm((p) => ({ ...p, hosts: e.target.value }))
              }
            />
            {fieldError("hosts")}
          </div>
          <div>
            <input
              className="border rounded p-2 w-full"
              placeholder="Primary host ex: school-a.meengine.io"
              value={form.primaryHost}
              onChange={(e) =>
                setForm((p) => ({ ...p, primaryHost: e.target.value }))
              }
            />
            {fieldError("primaryHost")}
          </div>
          <div>
            <input
              className="border rounded p-2 w-full"
              placeholder="School admin email"
              value={form.schoolAdminEmail}
              onChange={(e) =>
                setForm((p) => ({ ...p, schoolAdminEmail: e.target.value }))
              }
            />
            {fieldError("schoolAdminEmail")}
          </div>
          <div>
            <input
              className="border rounded p-2 w-full"
              placeholder="School admin password"
              type="password"
              value={form.schoolAdminPassword}
              onChange={(e) =>
                setForm((p) => ({ ...p, schoolAdminPassword: e.target.value }))
              }
            />
            {fieldError("schoolAdminPassword")}
          </div>
          <div>
            <input
              className="border rounded p-2 w-full"
              placeholder="School admin first name"
              value={form.schoolAdminFirstName}
              onChange={(e) =>
                setForm((p) => ({ ...p, schoolAdminFirstName: e.target.value }))
              }
            />
            {fieldError("schoolAdminFirstName")}
          </div>
          <div>
            <input
              className="border rounded p-2 w-full"
              placeholder="School admin last name"
              value={form.schoolAdminLastName}
              onChange={(e) =>
                setForm((p) => ({ ...p, schoolAdminLastName: e.target.value }))
              }
            />
            {fieldError("schoolAdminLastName")}
          </div>
          <input
            className="border rounded p-2"
            placeholder="License notes (opcional)"
            value={form.licenseNotes}
            onChange={(e) =>
              setForm((p) => ({ ...p, licenseNotes: e.target.value }))
            }
          />
          <input
            className="border rounded p-2"
            placeholder="License expiresAt (ISO datetime opcional)"
            value={form.licenseExpiresAt}
            onChange={(e) =>
              setForm((p) => ({ ...p, licenseExpiresAt: e.target.value }))
            }
          />
        </div>

        <div className="space-y-2">
          <div className="font-medium">Features (license)</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {featureList.map((f) => (
              <label
                key={f.key}
                className="flex gap-2 items-start border rounded p-2"
              >
                <input
                  type="checkbox"
                  checked={form.licenseFeatureKeys.includes(f.key)}
                  onChange={() => toggleFeature(f.key)}
                />
                <div>
                  <div className="font-medium">{f.name}</div>
                  <div className="text-sm text-gray-600">{f.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button
          className="bg-driving-primary text-white rounded px-4 py-2 disabled:opacity-50"
          disabled={isLoading}
          onClick={submit}
        >
          {isLoading ? "A criar…" : "Criar"}
        </button>
      </div>

      <div className="border rounded p-4 space-y-3">
        <h2 className="font-semibold">Organizações</h2>
        <div className="space-y-3">
          {orgs.map((o) => (
            <div key={o.id} className="border rounded p-3">
              <div className="font-semibold">{o.name}</div>
              <div className="text-sm text-gray-600">{o.id}</div>
              <div className="mt-2 text-sm">
                <div className="font-medium">Domains</div>
                <ul className="list-disc ml-5">
                  {o.domains?.map((d) => (
                    <li key={d.id}>
                      {d.host} {d.isPrimary ? "(primary)" : ""}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
          {orgs.length === 0 && (
            <div className="text-gray-600 text-sm">Sem organizações.</div>
          )}
        </div>
      </div>
    </div>
  );
}
