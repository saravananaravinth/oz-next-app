// oz-next-app/src/features/engagement/dealership-applications/analytics/dealership-meta-pixel.policy.ts
const META_PIXEL_DEALERSHIP_TOKENS = new Set<string>([
  "5a870906-dd78-4627-aef1-d176409ac268",
  "372c21ef-6665-4d34-b24d-622b1ff3e90a",
]);

export function isDealershipMetaPixelTokenAllowed(token: string): boolean {
  return META_PIXEL_DEALERSHIP_TOKENS.has(
    token.trim().toLocaleLowerCase("en-US"),
  );
}
