// oz-next-app/src/features/engagement/operations-dashboard/utils/display-text.ts
export function truncateDisplayName(
  value: string,
  maximumCharacters = 24,
): string {
  if (!Number.isInteger(maximumCharacters) || maximumCharacters < 1) {
    throw new RangeError("maximumCharacters must be a positive integer");
  }
  const characters = Array.from(value);
  return characters.length <= maximumCharacters
    ? value
    : `${characters.slice(0, maximumCharacters).join("")}…`;
}
