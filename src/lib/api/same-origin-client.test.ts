// oz-next-app/src/lib/api/same-origin-client.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { ApiHttpError } from "@/lib/api/problem";
import { sameOriginFetch } from "@/lib/api/same-origin-client";
import { HTTP_METHODS } from "@/lib/api/http-contract";

const refreshResponseSchema = z
  .object({
    status: z.literal("success"),
    refreshed: z.literal(true),
    expires_in: z.number().int().positive(),
  })
  .strict();

const successfulRefreshPayload = {
  status: "success",
  refreshed: true,
  expires_in: 900,
} as const;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sameOriginFetch", () => {
  it("calls an allowed route with credential-safe defaults", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json(successfulRefreshPayload, { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sameOriginFetch("/api/auth/refresh", {
        method: HTTP_METHODS.POST,
        schema: refreshResponseSchema,
      }),
    ).resolves.toEqual(successfulRefreshPayload);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [path, init] = fetchMock.mock.calls[0] ?? [];
    expect(path).toBe("/api/auth/refresh");
    expect(init).toMatchObject({
      method: HTTP_METHODS.POST,
      cache: "no-store",
      credentials: "include",
      redirect: "error",
    });
    expect(new Headers(init?.headers).get("accept")).toBe("application/json");
  });

  it.each([
    "https://example.com/api/auth/refresh",
    "//example.com/api/auth/refresh",
    "/api/auth/logout",
    "/api/auth/../auth/refresh",
    "/api/auth/%2e%2e/refresh",
  ])("rejects unsafe or unapproved path %s", async (path) => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sameOriginFetch(path, {
        method: HTTP_METHODS.POST,
        schema: refreshResponseSchema,
      }),
    ).rejects.toBeInstanceOf(ApiHttpError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed success payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json({ refreshed: true }, { status: 200 })),
    );

    await expect(
      sameOriginFetch("/api/auth/refresh", {
        method: HTTP_METHODS.POST,
        schema: refreshResponseSchema,
      }),
    ).rejects.toMatchObject({
      name: "ApiHttpError",
      status: 502,
      code: "api_response_validation_failed",
    });
  });

  it("normalizes problem responses as ApiHttpError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        Response.json(
          {
            type: "https://erp.ozotec.test/problems/session-expired",
            title: "Session expired",
            status: 401,
            detail: "The refresh session is no longer valid.",
            code: "refresh_session_expired",
            request_id: "req_test_123",
            timestamp: "2026-07-20T00:00:00.000Z",
          },
          { status: 401, statusText: "Unauthorized" },
        ),
      ),
    );

    await expect(
      sameOriginFetch("/api/auth/refresh", {
        method: HTTP_METHODS.POST,
        schema: refreshResponseSchema,
      }),
    ).rejects.toMatchObject({
      name: "ApiHttpError",
      status: 401,
      code: "refresh_session_expired",
      requestId: "req_test_123",
    });
  });
});
