// oz-next-app/src/features/engagement/operations-dashboard/utils/dealer-configuration.ts
export const GOOGLE_MAPS_SHORT_URL_PREFIX = "https://maps.app.goo.gl/";
export const GOOGLE_MAPS_SHORT_CODE_PATTERN = /^[A-Za-z0-9_-]{1,128}$/u;
export const INDIAN_MOBILE_PATTERN = /^(?:\+?91)?[6-9][0-9]{9}$/u;

export type DealerConfigurationMutationCoordinator = Readonly<{
  acquire: () => boolean;
  release: () => void;
  succeed: (rowVersion: number) => void;
  getRowVersion: () => number;
  isLocked: () => boolean;
}>;

export function createDealerConfigurationMutationCoordinator(
  initialRowVersion: number,
): DealerConfigurationMutationCoordinator {
  let rowVersion = initialRowVersion;
  let locked = false;

  return {
    acquire: () => {
      if (locked) return false;
      locked = true;
      return true;
    },
    release: () => {
      locked = false;
    },
    succeed: (nextRowVersion) => {
      rowVersion = nextRowVersion;
      locked = false;
    },
    getRowVersion: () => rowVersion,
    isLocked: () => locked,
  };
}

export function extractGoogleMapsShortCode(value: string): string | null {
  const normalized = value.trim();
  if (GOOGLE_MAPS_SHORT_CODE_PATTERN.test(normalized)) return normalized;

  try {
    const url = new URL(normalized);
    if (
      url.protocol !== "https:" ||
      url.hostname.toLowerCase() !== "maps.app.goo.gl" ||
      url.port !== "" ||
      url.search !== "" ||
      url.hash !== ""
    ) {
      return null;
    }

    const pathSegments = url.pathname.split("/").filter(Boolean);
    const shortCode = pathSegments.length === 1 ? pathSegments[0] : undefined;
    return shortCode !== undefined &&
      GOOGLE_MAPS_SHORT_CODE_PATTERN.test(shortCode)
      ? shortCode
      : null;
  } catch {
    return null;
  }
}

export function normalizeIndianMobileE164(value: string): string | null {
  const normalized = value.trim();
  if (!INDIAN_MOBILE_PATTERN.test(normalized)) return null;
  return `+91${normalized.replace(/^\+?91/u, "")}`;
}
