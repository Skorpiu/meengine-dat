import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // typescript-eslint v8 replaced @typescript-eslint/ban-types with these
      // equivalent rules. DAT previously set ban-types to "warn".
      "@typescript-eslint/no-wrapper-object-types": "warn",
      "@typescript-eslint/no-unsafe-function-type": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "react/no-unescaped-entities": "warn",
      "prefer-const": "warn",
      "react-hooks/exhaustive-deps": "warn",
      // eslint-plugin-react-hooks v7 (pulled by eslint-config-next@16.3.1)
      // adds React Compiler rules that were not in DAT's previous Next 14 /
      // hooks 4.6.0 error contract. Fixing them would require a broad UI
      // rewrite, which is out of scope for this LTS security slice.
      // Keep them visible as warnings; do not treat as silent disable.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  {
    files: ["**/*.test.*", "**/*.spec.*", "**/*.integration.*"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-wrapper-object-types": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    ".build/**",
    "next-env.d.ts",
    "compose.integration.yml",
  ]),
]);

export default eslintConfig;
