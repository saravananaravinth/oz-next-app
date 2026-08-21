// oz-next-app/src/features/integrations/zoho-inventory/contracts/zoho-oauth-callback.ts
import {
  zohoOAuthCallbackQuerySchema,
  zohoOAuthDeniedQuerySchema,
  type ZohoOAuthCallbackQuery,
  type ZohoOAuthDeniedQuery,
} from "@/features/integrations/zoho-inventory/contracts/zoho-inventory.schema";

const ALLOWED_CALLBACK_QUERY_KEYS: ReadonlySet<string> = new Set([
  "code",
  "state",
  "error",
  "error_description",
  "error_uri",
  "location",
  "accounts-server",
]);

export type ParsedZohoOAuthCallback =
  | Readonly<{
      kind: "authorized";
      data: ZohoOAuthCallbackQuery;
    }>
  | Readonly<{
      kind: "denied";
      data: ZohoOAuthDeniedQuery;
    }>;

function hasDuplicateOrUnknownQuery(searchParams: URLSearchParams): boolean {
  const seen = new Set<string>();

  for (const key of searchParams.keys()) {
    if (!ALLOWED_CALLBACK_QUERY_KEYS.has(key) || seen.has(key)) {
      return true;
    }

    seen.add(key);
  }

  return false;
}

function providerMetadata(searchParams: URLSearchParams): Readonly<{
  location?: string;
  accountsServer?: string;
}> {
  const location = searchParams.get("location");
  const accountsServer = searchParams.get("accounts-server");

  return {
    ...(location === null ? {} : { location }),
    ...(accountsServer === null ? {} : { accountsServer }),
  };
}

export function parseZohoOAuthCallbackSearchParams(
  searchParams: URLSearchParams,
): ParsedZohoOAuthCallback | null {
  if (hasDuplicateOrUnknownQuery(searchParams)) {
    return null;
  }

  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (code !== null && error !== null) {
    return null;
  }

  const state = searchParams.get("state");
  const metadata = providerMetadata(searchParams);

  if (error !== null) {
    const errorDescription = searchParams.get("error_description");
    const errorUri = searchParams.get("error_uri");
    const parsed = zohoOAuthDeniedQuerySchema.safeParse({
      error,
      ...(state === null ? {} : { state }),
      ...metadata,
      ...(errorDescription === null ? {} : { errorDescription }),
      ...(errorUri === null ? {} : { errorUri }),
    });

    return parsed.success ? { kind: "denied", data: parsed.data } : null;
  }

  const parsed = zohoOAuthCallbackQuerySchema.safeParse({
    code,
    state,
    ...metadata,
  });

  return parsed.success ? { kind: "authorized", data: parsed.data } : null;
}
