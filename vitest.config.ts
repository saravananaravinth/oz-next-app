import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    clearMocks: true,
    restoreMocks: true,
    env: {
      NODE_ENV: "test",
      NEXT_PUBLIC_API_BASE_URL: "http://localhost:8787",
      NEXT_PUBLIC_APP_ENV: "test",
      NEXT_PUBLIC_APP_VERSION: "0.1.0-test",
      NEXT_PUBLIC_APP_ORIGIN: "http://localhost:3000",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_AUTH_CLIENT_ID: "erp-web-test",
    },
  },
});
