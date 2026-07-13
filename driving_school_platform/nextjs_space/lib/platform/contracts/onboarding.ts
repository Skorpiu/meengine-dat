import { z } from "zod";
import {
  FEATURE_DEFINITIONS,
  type FeatureKey,
} from "@/lib/config/license-features";

const FEATURE_KEYS = Object.keys(FEATURE_DEFINITIONS) as [
  FeatureKey,
  ...FeatureKey[],
];

/**
 * Server-side schema for POST /api/platform/organizations.
 * Must remain aligned with the route's HTTP contract.
 */
export const platformOnboardOrganizationServerSchema = z.object({
  name: z.string().min(2),
  hosts: z.array(z.string().min(3)).min(1),
  primaryHost: z.string().min(3),
  schoolAdminEmail: z.string().email(),
  schoolAdminPassword: z.string().min(8),
  schoolAdminFirstName: z.string().min(1),
  schoolAdminLastName: z.string().min(1),
  licenseFeatureKeys: z.array(z.enum(FEATURE_KEYS)).min(1),
  licenseNotes: z.string().optional(),
  licenseExpiresAt: z.string().datetime().optional(),
});

export type PlatformOnboardOrganizationServerInput = z.infer<
  typeof platformOnboardOrganizationServerSchema
>;

/**
 * Client-side form validation schema used by Platform dashboard.
 * Intentionally keeps current constraints/messages (including not validating licenseFeatureKeys).
 */
export const platformOnboardOrganizationClientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nome: mínimo 2 caracteres")
    .max(120, "Nome: máximo 120 caracteres"),
  hosts: z
    .string()
    .trim()
    .min(3, "Hosts: obrigatório (csv)")
    .refine(
      (v) =>
        v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean).length >= 1,
      "Hosts: indica pelo menos 1 host",
    ),
  primaryHost: z.string().trim().min(3, "Primary host: obrigatório"),
  schoolAdminEmail: z.string().trim().email("Email inválido"),
  schoolAdminPassword: z.string().min(8, "Password: mínimo 8 caracteres"),
  schoolAdminFirstName: z
    .string()
    .trim()
    .min(1, "Primeiro nome: obrigatório")
    .max(80, "Primeiro nome: máximo 80"),
  schoolAdminLastName: z
    .string()
    .trim()
    .min(1, "Último nome: obrigatório")
    .max(80, "Último nome: máximo 80"),
  licenseExpiresAt: z.string().optional(),
  licenseNotes: z.string().optional(),
});

export type PlatformOnboardOrganizationClientInput = z.infer<
  typeof platformOnboardOrganizationClientSchema
>;
