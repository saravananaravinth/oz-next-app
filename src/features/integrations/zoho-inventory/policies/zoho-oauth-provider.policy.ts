// oz-next-app/src/features/integrations/zoho-inventory/policies/zoho-oauth-provider.policy.ts
import type { ZohoInventoryDataCenter } from "@/features/integrations/zoho-inventory/contracts/zoho-inventory.schema";

type ZohoOAuthProviderDataCenter = Readonly<{
  location: Lowercase<ZohoInventoryDataCenter>;
  accountsOrigin: string;
}>;

const ZOHO_OAUTH_PROVIDER_DATA_CENTERS = {
  US: {
    location: "us",
    accountsOrigin: "https://accounts.zoho.com",
  },
  EU: {
    location: "eu",
    accountsOrigin: "https://accounts.zoho.eu",
  },
  IN: {
    location: "in",
    accountsOrigin: "https://accounts.zoho.in",
  },
  AU: {
    location: "au",
    accountsOrigin: "https://accounts.zoho.com.au",
  },
  CA: {
    location: "ca",
    accountsOrigin: "https://accounts.zohocloud.ca",
  },
} as const satisfies Record<
  ZohoInventoryDataCenter,
  ZohoOAuthProviderDataCenter
>;

const AUTHORIZATION_PATH = "/oauth/v2/auth";
const ALLOWED_AUTHORIZATION_QUERY_KEYS: ReadonlySet<string> = new Set([
  "scope",
  "client_id",
  "state",
  "response_type",
  "redirect_uri",
  "access_type",
  "prompt",
]);

function hasDuplicateOrUnexpectedAuthorizationParameter(url: URL): boolean {
  const seen = new Set<string>();

  for (const key of url.searchParams.keys()) {
    if (!ALLOWED_AUTHORIZATION_QUERY_KEYS.has(key) || seen.has(key)) {
      return true;
    }

    seen.add(key);
  }

  return false;
}

function isBareHttpsOrigin(value: string, expectedOrigin: string): boolean {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return false;
  }

  return (
    url.protocol === "https:" &&
    url.origin === expectedOrigin &&
    url.username.length === 0 &&
    url.password.length === 0 &&
    url.pathname === "/" &&
    url.search.length === 0 &&
    url.hash.length === 0
  );
}

export function assertZohoAuthorizationUrl(
  input: Readonly<{
    authorizationUrl: string;
    dataCenter: ZohoInventoryDataCenter;
    redirectUri: string;
  }>,
): string {
  let url: URL;

  try {
    url = new URL(input.authorizationUrl);
  } catch {
    throw new TypeError("zoho_authorization_url_invalid");
  }

  const provider = ZOHO_OAUTH_PROVIDER_DATA_CENTERS[input.dataCenter];
  const prompt = url.searchParams.get("prompt");
  const state = url.searchParams.get("state");

  if (
    url.origin !== provider.accountsOrigin ||
    url.pathname !== AUTHORIZATION_PATH ||
    url.username.length > 0 ||
    url.password.length > 0 ||
    url.hash.length > 0 ||
    hasDuplicateOrUnexpectedAuthorizationParameter(url) ||
    (url.searchParams.get("scope")?.trim().length ?? 0) === 0 ||
    (url.searchParams.get("client_id")?.trim().length ?? 0) === 0 ||
    url.searchParams.get("response_type") !== "code" ||
    url.searchParams.get("access_type") !== "offline" ||
    url.searchParams.get("redirect_uri") !== input.redirectUri ||
    prompt !== "consent" ||
    state === null ||
    !/^[A-Za-z0-9_-]{32,512}$/u.test(state)
  ) {
    throw new TypeError("zoho_authorization_url_invalid");
  }

  return state;
}

export function isZohoOAuthCallbackProviderValid(
  input: Readonly<{
    dataCenter: ZohoInventoryDataCenter;
    location?: string;
    accountsServer?: string;
  }>,
): boolean {
  const hasLocation = input.location !== undefined;
  const hasAccountsServer = input.accountsServer !== undefined;

  if (!hasLocation && !hasAccountsServer) {
    return true;
  }

  if (!hasLocation || !hasAccountsServer) {
    return false;
  }

  const provider = ZOHO_OAUTH_PROVIDER_DATA_CENTERS[input.dataCenter];

  return (
    input.location === provider.location &&
    isBareHttpsOrigin(input.accountsServer, provider.accountsOrigin)
  );
}
