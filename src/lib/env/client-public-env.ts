// oz-next-app/src/lib/env/client-public-env.ts
const CLIENT_APP_ENVIRONMENTS = [
  "local",
  "development",
  "staging",
  "production",
  "test",
] as const;

export type ClientAppEnvironment = (typeof CLIENT_APP_ENVIRONMENTS)[number];

function isClientAppEnvironment(
  value: string | undefined,
): value is ClientAppEnvironment {
  return CLIENT_APP_ENVIRONMENTS.some((environment) => environment === value);
}

export function classifyClientAppEnvironment(
  appEnvironment: string | undefined,
  nodeEnvironment: string | undefined,
): ClientAppEnvironment {
  if (isClientAppEnvironment(appEnvironment)) {
    return appEnvironment;
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
  process.env.NEXT_PUBLIC_APP_ENV,
  process.env.NODE_ENV,
);

export const isClientDevelopment =
  clientAppEnvironment === "development" || clientAppEnvironment === "local";

export const isClientProduction = clientAppEnvironment === "production";
