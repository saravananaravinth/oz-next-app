// oz-next-app/next.config.ts
import type { NextConfig } from "next";

type Header = Readonly<{
  key: string;
  value: string;
}>;

type RemotePattern = NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
>[number];

type HttpOriginOptions = Readonly<{
  fallbackDevelopmentOrigin?: string;
  blockCloudRun?: boolean;
  requiredInProduction?: boolean;
}>;

const LOCALHOST_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"] as const);

const CLOUD_RUN_HOST_SUFFIX = ".run.app";
const ONE_MEGABYTE = "1mb" as const;

const isDevelopment = process.env.NODE_ENV === "development";
const isProduction = process.env.NODE_ENV === "production";

function isLocalhost(hostname: string): boolean {
  return LOCALHOST_HOSTNAMES.has(hostname as "localhost" | "127.0.0.1" | "::1");
}

function requiredProductionConfigError(name: string): Error {
  return new Error(`${name} must be a valid HTTPS origin in production.`);
}

function parseHttpOrigin(
  name: string,
  value: string | undefined,
  options: HttpOriginOptions = {},
): string | null {
  const explicitValue = value?.trim();
  const fallbackDevelopmentOrigin = isDevelopment
    ? options.fallbackDevelopmentOrigin
    : undefined;
  const trimmed =
    explicitValue !== undefined && explicitValue.length > 0
      ? explicitValue
      : fallbackDevelopmentOrigin;
  const requiredInProduction = options.requiredInProduction ?? true;

  if (trimmed === undefined || trimmed.length === 0) {
    if (isProduction && requiredInProduction) {
      throw requiredProductionConfigError(name);
    }

    return null;
  }

  try {
    const url = new URL(trimmed);
    const localhost = isLocalhost(url.hostname);

    if (
      url.username.length > 0 ||
      url.password.length > 0 ||
      url.search.length > 0 ||
      url.hash.length > 0 ||
      url.pathname !== "/"
    ) {
      throw requiredProductionConfigError(name);
    }

    if (
      options.blockCloudRun === true &&
      url.hostname.endsWith(CLOUD_RUN_HOST_SUFFIX)
    ) {
      throw new Error(
        `${name} must target the public oz-erp-edge Worker origin, not Cloud Run.`,
      );
    }

    if (isProduction && (url.protocol !== "https:" || localhost)) {
      throw requiredProductionConfigError(name);
    }

    if (!isDevelopment && localhost) {
      return null;
    }

    if (!isDevelopment && url.protocol === "http:") {
      return null;
    }

    if (isDevelopment && url.protocol === "http:" && !localhost) {
      return null;
    }

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    return url.origin;
  } catch (error: unknown) {
    if (isProduction) {
      throw error instanceof Error
        ? error
        : requiredProductionConfigError(name);
    }

    return null;
  }
}

function uniqueSources(sources: ReadonlyArray<string | null>): string[] {
  return Array.from(
    new Set(sources.filter((source): source is string => source !== null)),
  );
}

function originToHost(origin: string): string {
  return new URL(origin).host;
}

function originToRemotePattern(origin: string): RemotePattern {
  const url = new URL(origin);

  return {
    protocol: url.protocol.replace(":", "") as "http" | "https",
    hostname: url.hostname,
    ...(url.port.length > 0 ? { port: url.port } : {}),
    pathname: "/**",
  } satisfies RemotePattern;
}

function buildRemotePatterns(origins: readonly string[]): RemotePattern[] {
  return origins.map(originToRemotePattern);
}

function readPublicAppOrigin(): string | undefined {
  const appOrigin = process.env["NEXT_PUBLIC_APP_ORIGIN"]?.trim();

  if (appOrigin !== undefined && appOrigin.length > 0) {
    return appOrigin;
  }

  const appUrl = process.env["NEXT_PUBLIC_APP_URL"]?.trim();

  return appUrl !== undefined && appUrl.length > 0 ? appUrl : undefined;
}

const appOrigin = parseHttpOrigin(
  "NEXT_PUBLIC_APP_URL/NEXT_PUBLIC_APP_ORIGIN",
  readPublicAppOrigin(),
  {
    fallbackDevelopmentOrigin: "http://localhost:3000",
  },
);

const apiOrigin = parseHttpOrigin(
  "NEXT_PUBLIC_API_BASE_URL",
  process.env["NEXT_PUBLIC_API_BASE_URL"],
  {
    fallbackDevelopmentOrigin: "http://localhost:8787",
    blockCloudRun: true,
  },
);

const imageOrigins = uniqueSources([appOrigin, apiOrigin]);
const allowedServerActionOrigins = uniqueSources([appOrigin]).map(originToHost);

const allowedDevOrigins = isDevelopment
  ? uniqueSources([
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:8787",
      "http://127.0.0.1:8787",
      appOrigin,
      apiOrigin,
    ])
  : [];

const productionOnlySecurityHeaders: readonly Header[] = isProduction
  ? [
      {
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains; preload",
      },
    ]
  : [];

const securityHeaders: readonly Header[] = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "off",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-site",
  },
  {
    key: "Origin-Agent-Cluster",
    value: "?1",
  },
  ...productionOnlySecurityHeaders,
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  typedRoutes: true,
  trailingSlash: false,
  allowedDevOrigins,

  typescript: {
    ignoreBuildErrors: false,
  },

  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: false,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: buildRemotePatterns(imageOrigins),
  },

  experimental: {
    serverActions: {
      bodySizeLimit: ONE_MEGABYTE,
      allowedOrigins: allowedServerActionOrigins,
    },
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...securityHeaders],
      },
    ];
  },
} satisfies NextConfig;

export default nextConfig;
