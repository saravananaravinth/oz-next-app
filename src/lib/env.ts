// oz-next-app/src/lib/env.ts
import { z } from "zod";

const envSchema = z
  .object({
    NEXT_PUBLIC_API_BASE_URL: z
      .string()
      .trim()
      .pipe(z.url())
      .default("https://api.ozotecev.com"),
    NEXT_PUBLIC_APP_ENV: z
      .enum(["local", "development", "staging", "production", "test"])
      .default("development"),
    NEXT_PUBLIC_APP_VERSION: z.string().trim().min(1).max(128).default("0.1.0"),
    NEXT_PUBLIC_APP_ORIGIN: z
      .string()
      .trim()
      .pipe(z.url())
      .default("https://erp.ozotecev.com"),
    NEXT_PUBLIC_AUTH_CLIENT_ID: z
      .string()
      .trim()
      .min(1)
      .max(128)
      .default("oz-next-app"),
  })
  .strict();

export const env = envSchema.parse({
  NEXT_PUBLIC_API_BASE_URL: process.env["NEXT_PUBLIC_API_BASE_URL"],
  NEXT_PUBLIC_APP_ENV: process.env["NEXT_PUBLIC_APP_ENV"],
  NEXT_PUBLIC_APP_VERSION: process.env["NEXT_PUBLIC_APP_VERSION"],
  NEXT_PUBLIC_APP_ORIGIN: process.env["NEXT_PUBLIC_APP_ORIGIN"],
  NEXT_PUBLIC_AUTH_CLIENT_ID: process.env["NEXT_PUBLIC_AUTH_CLIENT_ID"],
});

export type PublicEnv = typeof env;

export const isProduction = env.NEXT_PUBLIC_APP_ENV === "production";
export const isDevelopment =
  env.NEXT_PUBLIC_APP_ENV === "development" ||
  env.NEXT_PUBLIC_APP_ENV === "local";
