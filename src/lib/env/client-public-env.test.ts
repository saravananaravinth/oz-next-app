// oz-next-app/src/lib/env/client-public-env.test.ts
import { describe, expect, it } from "vitest";

import {
  classifyClientAppEnvironment,
  clientAppEnvironment,
  isClientDevelopment,
  isClientProduction,
} from "@/lib/env/client-public-env";

describe("client public environment", () => {
  it.each([
    ["local", "production", "local"],
    ["development", "production", "development"],
    ["staging", "development", "staging"],
    ["production", "development", "production"],
    ["test", "production", "test"],
  ] as const)(
    "uses an explicit %s app environment",
    (appEnvironment, nodeEnvironment, expected) => {
      expect(
        classifyClientAppEnvironment(appEnvironment, nodeEnvironment),
      ).toBe(expected);
    },
  );

  it.each([
    [undefined, "production", "production"],
    ["invalid", "production", "production"],
    [undefined, "test", "test"],
    [undefined, "development", "development"],
  ] as const)(
    "falls back safely for app=%s and node=%s",
    (appEnvironment, nodeEnvironment, expected) => {
      expect(
        classifyClientAppEnvironment(appEnvironment, nodeEnvironment),
      ).toBe(expected);
    },
  );

  it("does not enable diagnostics in the test environment", () => {
    expect(clientAppEnvironment).toBe("test");
    expect(isClientDevelopment).toBe(false);
    expect(isClientProduction).toBe(false);
  });
});
