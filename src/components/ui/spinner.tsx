// oz-next-app/src/components/ui/spinner.tsx
import type { ComponentPropsWithoutRef } from "react";
import { Loader2Icon } from "lucide-react";

import { cn } from "@/lib/utils";

const DEFAULT_SPINNER_LABEL = "Loading";
const MAX_SPINNER_LABEL_LENGTH = 96;
const CONTROL_CHARACTER_DELETE = 127;
const CONTROL_CHARACTER_MAX_CODE_POINT = 31;
const SPINNER_CLASS_NAME =
  "size-4 shrink-0 animate-spin motion-reduce:animate-none";

type SpinnerIconProps = ComponentPropsWithoutRef<typeof Loader2Icon>;

export type SpinnerProps = Omit<
  SpinnerIconProps,
  | "aria-hidden"
  | "aria-label"
  | "aria-labelledby"
  | "children"
  | "focusable"
  | "role"
> &
  Readonly<{
    /**
     * Accessible label announced when the spinner represents a meaningful loading state.
     *
     * Ignored when `decorative` is true.
     */
    label?: string;

    /**
     * Use for spinners inside already-labelled controls or regions.
     *
     * Example: a submit button with visible text "Saving…" should usually render
     * `<Spinner decorative />` to avoid duplicate screen-reader announcements.
     */
    decorative?: boolean;
  }>;

function replaceControlCharacters(value: string): string {
  let normalized = "";

  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.charCodeAt(index);
    normalized +=
      codePoint <= CONTROL_CHARACTER_MAX_CODE_POINT ||
      codePoint === CONTROL_CHARACTER_DELETE
        ? " "
        : value.charAt(index);
  }

  return normalized;
}

function normalizeSpinnerLabel(value: string): string {
  const normalized = replaceControlCharacters(value).trim();

  if (normalized.length === 0) {
    return DEFAULT_SPINNER_LABEL;
  }

  if (normalized.length <= MAX_SPINNER_LABEL_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_SPINNER_LABEL_LENGTH - 1).trimEnd()}…`;
}

function Spinner({
  className,
  decorative = false,
  label = DEFAULT_SPINNER_LABEL,
  ...props
}: SpinnerProps) {
  const iconClassName = cn(SPINNER_CLASS_NAME, className);

  if (decorative) {
    return (
      <Loader2Icon
        {...props}
        aria-hidden="true"
        className={iconClassName}
        data-slot="spinner"
        focusable="false"
      />
    );
  }

  return (
    <Loader2Icon
      {...props}
      aria-label={normalizeSpinnerLabel(label)}
      aria-live="polite"
      className={iconClassName}
      data-slot="spinner"
      focusable="false"
      role="status"
    />
  );
}

export { Spinner };
