// oz-next-app/src/lib/env/client-public-env.ts
import { z } from "zod";

const CLIENT_APP_ENVIRONMENTS = [
  "local",
  "development",
  "staging",
  "production",
  "test",
] as const;

const clientAppEnvironmentSchema = z.enum(CLIENT_APP_ENVIRONMENTS);

const clientPublicEnvInputSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).optional(),
    NEXT_PUBLIC_APP_ENV: clientAppEnvironmentSchema.optional(),
    NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY: z.string().trim().optional(),
    NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID: z.string().trim().optional(),
  })
  .strict();

const parsedClientPublicEnv = clientPublicEnvInputSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY:
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY,
  NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID,
});

export type ClientAppEnvironment = z.output<typeof clientAppEnvironmentSchema>;

export function classifyClientAppEnvironment(
  appEnvironment: string | undefined,
  nodeEnvironment: string | undefined,
): ClientAppEnvironment {
  const parsedAppEnvironment =
    clientAppEnvironmentSchema.safeParse(appEnvironment);
  if (parsedAppEnvironment.success) {
    return parsedAppEnvironment.data;
  }

  if (nodeEnvironment === "production") {
    return "production";
  }

  if (nodeEnvironment === "test") {
    return "test";
  }

  return "development";
}

export const clientAppEnvironment = classifyClientAppEnvironment(
  parsedClientPublicEnv.NEXT_PUBLIC_APP_ENV,
  parsedClientPublicEnv.NODE_ENV,
);

const googleMapsClientPublicEnvSchema = z
  .object({
    browserKey: z
      .string()
      .trim()
      .regex(/^AIza[0-9A-Za-z_-]{35}$/u)
      .optional(),
    mapId: z
      .string()
      .trim()
      .regex(/^(?:[A-Fa-f0-9]{16}|[A-Fa-f0-9]{24}|DEMO_MAP_ID)$/u)
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if ((value.browserKey === undefined) !== (value.mapId === undefined)) {
      context.addIssue({
        code: "custom",
        path: ["browserKey"],
        message:
          "NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY and NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID must be configured together.",
      });
    }

    if (
      clientAppEnvironment === "production" &&
      value.mapId === "DEMO_MAP_ID"
    ) {
      context.addIssue({
        code: "custom",
        path: ["mapId"],
        message: "DEMO_MAP_ID is not permitted in production.",
      });
    }
  });

export type ClientGoogleMapsPublicEnv = z.output<
  typeof googleMapsClientPublicEnvSchema
>;

export const clientGoogleMapsPublicEnv = googleMapsClientPublicEnvSchema.parse({
  browserKey: parsedClientPublicEnv.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY,
  mapId: parsedClientPublicEnv.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID,
});

export const isClientDevelopment =
  clientAppEnvironment === "development" || clientAppEnvironment === "local";

export const isClientProduction = clientAppEnvironment === "production";
