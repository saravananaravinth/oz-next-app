// oz-next-app/eslint.config.js
import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

const generatedArtifactIgnores = [
  "node_modules/**",
  ".next/**",
  ".open-next/**",
  ".vercel/**",
  ".wrangler/**",
  ".wrangler-state/**",
  ".mf/**",
  ".turbo/**",
  "coverage/**",
  "dist/**",
  "build/**",
  "out/**",
  "playwright-report/**",
  "test-results/**",
  "bundles/**",
  "*.tsbuildinfo",
  "tsconfig.tsbuildinfo",
  "next-env.d.ts",
  "cloudflare-env.d.ts",
  "worker-configuration.d.ts",
  "src/types/cloudflare-bindings.d.ts",
  "package-lock.json",
];

const browserAndNodeGlobals = {
  ...globals.browser,
  ...globals.node,
};

const nodeGlobals = {
  ...globals.node,
};

const testGlobals = {
  ...globals.node,
  after: "readonly",
  afterEach: "readonly",
  before: "readonly",
  beforeEach: "readonly",
  describe: "readonly",
  it: "readonly",
  test: "readonly",
};

const projectTypeCheckedFiles = [
  "middleware.ts",
  "src/**/*.ts",
  "src/**/*.tsx",
  "next.config.ts",
  "open-next.config.ts",
];

const nonProjectTypeScriptFiles = [
  "*.config.ts",
  "*.config.mts",
  "scripts/**/*.ts",
  "tests/**/*.ts",
  "tests/**/*.tsx",
  "src/**/*.test.ts",
  "src/**/*.test.tsx",
  "src/**/*.spec.ts",
  "src/**/*.spec.tsx",
];

const javascriptConfigFiles = [
  "*.config.js",
  "*.config.mjs",
  "eslint.config.js",
  "postcss.config.mjs",
  "scripts/**/*.js",
  "scripts/**/*.mjs",
];

const requestPathFiles = [
  "middleware.ts",
  "src/app/**/*.{ts,tsx}",
  "src/server/**/*.{ts,tsx}",
  "src/lib/**/*.{ts,tsx}",
  "src/features/**/*.{ts,tsx}",
];

const rawFetchRestrictedFiles = [
  "src/app/**/*.{ts,tsx}",
  "src/components/**/*.{ts,tsx}",
  "src/features/**/*.{ts,tsx}",
  "src/shared/hooks/**/*.{ts,tsx}",
  "src/lib/**/*.{ts,tsx}",
  "src/app/_providers/**/*.{ts,tsx}",
];

const rawFetchAllowedFiles = [
  "src/lib/api/**/*.{ts,tsx}",
  "src/server/api/**/*.{ts,tsx}",
  "src/server/http/**/*.{ts,tsx}",
  "src/app/api/**/*.{ts,tsx}",
];

const clientFiles = [
  "src/components/**/*.{ts,tsx}",
  "src/app/**/error.tsx",
  "src/features/**/ui/**/*.{ts,tsx}",
  "src/features/**/hooks/**/*.{ts,tsx}",
  "src/shared/hooks/**/*.{ts,tsx}",
  "src/app/_providers/**/*.{ts,tsx}",
  "src/lib/api/browser-client.{ts,tsx}",
  "src/lib/auth/**/*.client.{ts,tsx}",
  "src/**/*.client.{ts,tsx}",
];

const serverFiles = [
  "middleware.ts",
  "src/server/**/*.{ts,tsx}",
  "src/app/api/**/*.{ts,tsx}",
  "src/**/*.server.{ts,tsx}",
  "src/features/**/server/**/*.{ts,tsx}",
  "src/features/**/actions/**/*.{ts,tsx}",
  "src/lib/security/**/*.{ts,tsx}",
  "src/lib/env/**/*.{ts,tsx}",
];

const authSensitiveFiles = [
  "src/app/**/auth/**/*.{ts,tsx}",
  "src/app/api/auth/**/*.{ts,tsx}",
  "src/features/auth/**/*.{ts,tsx}",
  "src/server/auth/**/*.{ts,tsx}",
];

const envAllowedFiles = [
  "src/lib/env/**/*.{ts,tsx}",
  "src/server/env.{ts,tsx}",
  "src/server/env/**/*.{ts,tsx}",
  "next.config.ts",
  "open-next.config.ts",
];

const heavyweightNodeRuntimeImports = [
  "child_process",
  "cluster",
  "dgram",
  "fs",
  "fs/promises",
  "net",
  "tls",
  "worker_threads",
  "vm",
  "node:child_process",
  "node:cluster",
  "node:dgram",
  "node:fs",
  "node:fs/promises",
  "node:net",
  "node:tls",
  "node:worker_threads",
  "node:vm",
];

const serverOnlyImportPatternGroups = [
  ["@/server/*", "@/server/**"],
  ["@/lib/api/server", "@/lib/api/server/*", "@/lib/api/server/**"],
  ["@/lib/auth/server", "@/lib/auth/server/*", "@/lib/auth/server/**"],
  ["@/features/**/server/*", "@/features/**/server/**"],
];

const serverOnlyImportPaths = ["@/lib/env", "@/lib/env/public-env"];

const clientOnlyImportPatternGroups = [
  [
    "@/lib/api/browser-client",
    "@/lib/api/browser-client/*",
    "@/lib/api/browser-client/**",
  ],
  ["@/lib/auth/*.client", "@/lib/auth/**/*.client"],
  ["@/features/*/hooks/*", "@/features/*/hooks/**"],
  ["@/shared/hooks/*", "@/shared/hooks/**"],
  ["@/app/_providers/*", "@/app/_providers/**"],
];

const restrictedBrowserStorageSelectors = [
  {
    selector: "Identifier[name='localStorage']",
    message:
      "Do not use localStorage for ERP auth, tenant, actor, token, session, or PII state. Use Secure HttpOnly server-managed cookies and server-only session helpers.",
  },
  {
    selector: "Identifier[name='sessionStorage']",
    message:
      "Do not use sessionStorage for ERP auth, tenant, actor, token, session, or PII state. Use Secure HttpOnly server-managed cookies and server-only session helpers.",
  },
  {
    selector: "Identifier[name='indexedDB']",
    message:
      "Do not use IndexedDB for ERP auth, tenant, actor, token, session, or PII state.",
  },
  {
    selector: "MemberExpression[property.name='localStorage']",
    message:
      "Do not use localStorage for ERP auth, tenant, actor, token, session, or PII state. Use Secure HttpOnly server-managed cookies and server-only session helpers.",
  },
  {
    selector: "MemberExpression[property.name='sessionStorage']",
    message:
      "Do not use sessionStorage for ERP auth, tenant, actor, token, session, or PII state. Use Secure HttpOnly server-managed cookies and server-only session helpers.",
  },
  {
    selector: "MemberExpression[property.name='indexedDB']",
    message:
      "Do not use IndexedDB for ERP auth, tenant, actor, token, session, or PII state.",
  },
];

export default defineConfig(
  {
    ignores: generatedArtifactIgnores,
  },

  ...nextCoreWebVitals,
  ...nextTypescript,

  {
    files: javascriptConfigFiles,
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: nodeGlobals,
    },
    rules: {
      "no-console": "off",
    },
  },

  {
    files: projectTypeCheckedFiles,
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: browserAndNodeGlobals,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "no-alert": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-undef": "off",
      "react/no-danger": "error",

      "@typescript-eslint/array-type": ["error", { default: "array-simple" }],
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          minimumDescriptionLength: 25,
          "ts-check": false,
          "ts-expect-error": "allow-with-description",
          "ts-ignore": true,
          "ts-nocheck": true,
        },
      ],
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports",
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksVoidReturn: {
            attributes: false,
          },
        },
      ],
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-require-imports": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/prefer-nullish-coalescing": "error",
      "@typescript-eslint/prefer-optional-chain": "error",
      "@typescript-eslint/require-await": "error",
      "@typescript-eslint/return-await": ["error", "always"],
    },
  },

  {
    files: nonProjectTypeScriptFiles,
    extends: [
      js.configs.recommended,
      tseslint.configs.strict,
      tseslint.configs.stylistic,
      tseslint.configs.disableTypeChecked,
    ],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: testGlobals,
      parserOptions: {
        project: false,
        projectService: false,
      },
    },
    rules: {
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/require-await": "off",
      "no-console": "off",
      "no-undef": "off",
    },
  },

  {
    files: ["src/**/*.d.ts"],
    rules: {
      "@typescript-eslint/consistent-type-definitions": "off",
    },
  },

  {
    files: requestPathFiles,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: heavyweightNodeRuntimeImports.map((name) => ({
            name,
            message:
              "Avoid heavyweight Node runtime modules in Next/OpenNext request paths. Use Web APIs or isolate Node-only work outside Cloudflare request execution.",
          })),
        },
      ],
    },
  },

  {
    files: rawFetchRestrictedFiles,
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.name='fetch']",
          message:
            "Do not scatter raw fetch calls. Use centralized typed API clients in src/lib/api or server API callers in src/server/api with envelope/problem validation.",
        },
      ],
    },
  },

  {
    files: rawFetchAllowedFiles,
    rules: {
      "no-restricted-syntax": "off",
    },
  },

  {
    files: clientFiles,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: serverOnlyImportPaths.map((name) => ({
            name,
            message:
              "Client/browser code must not import server-validated environment modules. Import the explicit client-public environment module instead.",
          })),
          patterns: serverOnlyImportPatternGroups.map((group) => ({
            group,
            message:
              "Client/browser code must not import server-only modules. Keep tokens, cookies, bindings, and server API callers behind server boundaries.",
          })),
        },
      ],
    },
  },

  {
    files: serverFiles,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: clientOnlyImportPatternGroups.map((group) => ({
            group,
            message:
              "Server-only code must not import browser/client modules. Use server API clients, server session helpers, and server-safe utilities.",
          })),
        },
      ],
    },
  },

  {
    files: authSensitiveFiles,
    rules: {
      "no-restricted-syntax": ["error", ...restrictedBrowserStorageSelectors],
    },
  },

  {
    files: ["src/**/*.{ts,tsx}", "middleware.ts"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message:
            "Do not read process.env directly outside src/lib/env/**. Validate environment variables with Zod and import typed env values.",
        },
      ],
    },
  },

  {
    files: envAllowedFiles,
    rules: {
      "no-restricted-properties": "off",
    },
  },

  {
    files: [
      "tests/**/*.{ts,tsx}",
      "src/**/*.test.{ts,tsx}",
      "src/**/*.spec.{ts,tsx}",
    ],
    languageOptions: {
      globals: testGlobals,
    },
    rules: {
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/require-await": "off",
      "no-console": "off",
    },
  },

  prettier,
);
