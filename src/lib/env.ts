// oz-next-app/src/lib/env.ts
import { z } from "zod";

const APP_ENV_VALUES = [
  "local",
  "development",
  "staging",
  "production",
  "test",
] as const;

const appEnvironmentSchema = z.enum(APP_ENV_VALUES);

const absoluteHttpUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(2_048)
  .pipe(z.url())
  .transform((value) => new URL(value))
  .superRefine((url, context) => {
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      context.addIssue({
        code: "custom",
        message: "URL must use http or https.",
      });
    }

    if (url.username.length > 0 || url.password.length > 0) {
      context.addIssue({
        code: "custom",
        message: "URL credentials are not allowed.",
      });
    }

    if (url.search.length > 0 || url.hash.length > 0) {
      context.addIssue({
        code: "custom",
        message: "URL query strings and fragments are not allowed.",
      });
    }
  })
  .transform((url) => url.toString().replace(/\/$/u, ""));

const publicAppOriginSchema = absoluteHttpUrlSchema.superRefine(
  (value, context) => {
    const url = new URL(value);

    if (url.pathname !== "/") {
      context.addIssue({
        code: "custom",
        message: "Application origin must not include a path.",
      });
    }
  },
);

const publicApiBaseUrlSchema = absoluteHttpUrlSchema.superRefine(
  (value, context) => {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();

    if (url.pathname !== "/") {
      context.addIssue({
        code: "custom",
        message: "API base URL must not include a path.",
      });
    }

    if (hostname.endsWith(".run.app")) {
      context.addIssue({
        code: "custom",
        message:
          "Cloud Run URLs are private implementation details. Use the oz-erp-edge Worker origin.",
      });
    }
  },
);

const rawEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).optional(),
    NEXT_PUBLIC_API_BASE_URL: z.string().trim().optional(),
    NEXT_PUBLIC_APP_ENV: appEnvironmentSchema.optional(),
    NEXT_PUBLIC_APP_VERSION: z.string().trim().min(1).max(128).optional(),
    NEXT_PUBLIC_APP_URL: z.string().trim().optional(),
    NEXT_PUBLIC_APP_ORIGIN: z.string().trim().optional(),
    NEXT_PUBLIC_AUTH_CLIENT_ID: z.string().trim().min(1).max(128).optional(),
  })
  .strict();

const parsedRawEnv = rawEnvSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_API_BASE_URL: process.env["NEXT_PUBLIC_API_BASE_URL"],
  NEXT_PUBLIC_APP_ENV: process.env["NEXT_PUBLIC_APP_ENV"],
  NEXT_PUBLIC_APP_VERSION: process.env["NEXT_PUBLIC_APP_VERSION"],
  NEXT_PUBLIC_APP_URL: process.env["NEXT_PUBLIC_APP_URL"],
  NEXT_PUBLIC_APP_ORIGIN: process.env["NEXT_PUBLIC_APP_ORIGIN"],
  NEXT_PUBLIC_AUTH_CLIENT_ID: process.env["NEXT_PUBLIC_AUTH_CLIENT_ID"],
});

const nodeEnvironment = parsedRawEnv.NODE_ENV ?? "development";
const appEnvironment =
  parsedRawEnv.NEXT_PUBLIC_APP_ENV ??
  (nodeEnvironment === "production"
    ? "production"
    : nodeEnvironment === "test"
      ? "test"
      : "development");
const isStrictEnvironment =
  appEnvironment === "production" || appEnvironment === "staging";

function requiredInStrictEnvironment(
  name: string,
  value: string | undefined,
  localFallback: string,
): string {
  if (value !== undefined && value.length > 0) {
    return value;
  }

  if (isStrictEnvironment) {
    throw new Error(`${name} is required for ${appEnvironment}.`);
  }

  return localFallback;
}

const appOriginInput = requiredInStrictEnvironment(
  "NEXT_PUBLIC_APP_ORIGIN",
  parsedRawEnv.NEXT_PUBLIC_APP_ORIGIN ?? parsedRawEnv.NEXT_PUBLIC_APP_URL,
  "http://localhost:3000",
);

const envSchema = z
  .object({
    NEXT_PUBLIC_API_BASE_URL: publicApiBaseUrlSchema,
    NEXT_PUBLIC_APP_ENV: appEnvironmentSchema,
    NEXT_PUBLIC_APP_VERSION: z.string().trim().min(1).max(128),
    NEXT_PUBLIC_APP_URL: publicAppOriginSchema.optional(),
    NEXT_PUBLIC_APP_ORIGIN: publicAppOriginSchema,
    NEXT_PUBLIC_AUTH_CLIENT_ID: z
      .string()
      .trim()
      .min(1)
      .max(128)
      .regex(/^[A-Za-z0-9._:-]+$/u),
  })
  .strict()
  .superRefine((value, context) => {
    const strictEnvironment =
      value.NEXT_PUBLIC_APP_ENV === "production" ||
      value.NEXT_PUBLIC_APP_ENV === "staging";

    if (!strictEnvironment) {
      return;
    }

    if (!value.NEXT_PUBLIC_APP_ORIGIN.startsWith("https://")) {
      context.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_APP_ORIGIN"],
        message: "Application origin must use HTTPS in staging and production.",
      });
    }

    if (!value.NEXT_PUBLIC_API_BASE_URL.startsWith("https://")) {
      context.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_API_BASE_URL"],
        message: "API base URL must use HTTPS in staging and production.",
      });
    }
  });

export const env = envSchema.parse({
  NEXT_PUBLIC_API_BASE_URL: requiredInStrictEnvironment(
    "NEXT_PUBLIC_API_BASE_URL",
    parsedRawEnv.NEXT_PUBLIC_API_BASE_URL,
    "http://localhost:8787",
  ),
  NEXT_PUBLIC_APP_ENV: appEnvironment,
  NEXT_PUBLIC_APP_VERSION: requiredInStrictEnvironment(
    "NEXT_PUBLIC_APP_VERSION",
    parsedRawEnv.NEXT_PUBLIC_APP_VERSION,
    "0.1.0",
  ),
  ...(parsedRawEnv.NEXT_PUBLIC_APP_URL !== undefined
    ? { NEXT_PUBLIC_APP_URL: parsedRawEnv.NEXT_PUBLIC_APP_URL }
    : {}),
  NEXT_PUBLIC_APP_ORIGIN: appOriginInput,
  NEXT_PUBLIC_AUTH_CLIENT_ID: requiredInStrictEnvironment(
    "NEXT_PUBLIC_AUTH_CLIENT_ID",
    parsedRawEnv.NEXT_PUBLIC_AUTH_CLIENT_ID,
    "erp-web",
  ),
});

export type PublicEnv = typeof env;

export const isProduction = env.NEXT_PUBLIC_APP_ENV === "production";

export const isDevelopment =
  env.NEXT_PUBLIC_APP_ENV === "development" ||
  env.NEXT_PUBLIC_APP_ENV === "local";
