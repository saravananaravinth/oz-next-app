// oz-next-app/src/components/common/feedback/coming-soon.tsx
import { useId, type ReactElement } from "react";
import Link from "next/link";
import { ArrowLeft, Clock3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { safeInternalHref } from "@/lib/security/navigation";

export type ComingSoonProps = Readonly<{
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}>;

type NormalizeTextInput = Readonly<{
  value: string | undefined;
  fallback: string;
  maxLength: number;
}>;

const DEFAULT_TITLE = "Coming soon";
const DEFAULT_DESCRIPTION =
  "This workspace module is being prepared. It will appear here once it is enabled for your role and tenant.";
const DEFAULT_BACK_LABEL = "Back to dashboard";
const DEFAULT_SUPPORTING_TEXT = "No action is required from you right now.";

const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 240;
const MAX_LABEL_LENGTH = 60;

const C0_CONTROL_CODE_POINT_MAX = 0x1f;
const DELETE_CONTROL_CODE_POINT = 0x7f;
const WHITESPACE_RE = /\s+/gu;

function isControlCodePoint(codePoint: number): boolean {
  return (
    codePoint <= C0_CONTROL_CODE_POINT_MAX ||
    codePoint === DELETE_CONTROL_CODE_POINT
  );
}

function replaceControlCharacters(value: string): string {
  let sanitized = "";

  for (const character of value) {
    const codePoint = character.codePointAt(0);

    sanitized +=
      codePoint !== undefined && isControlCodePoint(codePoint)
        ? " "
        : character;
  }

  return sanitized;
}

function normalizeSpacing(value: string): string {
  return replaceControlCharacters(value).replace(WHITESPACE_RE, " ").trim();
}

function truncateText(value: string, maxLength: number): string {
  const characters = Array.from(value);

  if (characters.length <= maxLength) {
    return value;
  }

  return `${characters
    .slice(0, Math.max(0, maxLength - 1))
    .join("")
    .trimEnd()}…`;
}

function normalizeText({
  value,
  fallback,
  maxLength,
}: NormalizeTextInput): string {
  const normalized = normalizeSpacing(value ?? "");

  if (normalized.length === 0) {
    return fallback;
  }

  return truncateText(normalized, maxLength);
}

export function ComingSoon({
  title,
  description,
  backHref,
  backLabel,
}: ComingSoonProps): ReactElement {
  const reactId = useId();
  const titleId = `${reactId}-coming-soon-title`;
  const descriptionId = `${reactId}-coming-soon-description`;
  const supportingTextId = `${reactId}-coming-soon-supporting-text`;

  const resolvedTitle = normalizeText({
    value: title,
    fallback: DEFAULT_TITLE,
    maxLength: MAX_TITLE_LENGTH,
  });
  const resolvedDescription = normalizeText({
    value: description,
    fallback: DEFAULT_DESCRIPTION,
    maxLength: MAX_DESCRIPTION_LENGTH,
  });
  const resolvedBackHref = safeInternalHref(backHref);
  const resolvedBackLabel = normalizeText({
    value: backLabel,
    fallback: DEFAULT_BACK_LABEL,
    maxLength: MAX_LABEL_LENGTH,
  });

  return (
    <section
      aria-describedby={`${descriptionId} ${supportingTextId}`}
      aria-labelledby={titleId}
      className="flex min-h-[min(680px,calc(100dvh-8rem))] items-center justify-center px-4 py-10 sm:px-6 lg:px-8"
    >
      <Card className="w-full max-w-xl text-center">
        <CardHeader className="items-center gap-5 px-6 pt-8 sm:px-8 sm:pt-10">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-border/70 bg-primary/10 text-primary shadow-xs shadow-foreground/5">
            <Clock3 aria-hidden="true" className="size-7" />
          </div>

          <div className="mx-auto grid max-w-prose gap-3">
            <CardTitle
              id={titleId}
              aria-level={1}
              role="heading"
              className="text-section-title"
            >
              {resolvedTitle}
            </CardTitle>

            <CardDescription
              id={descriptionId}
              className="text-body text-muted-readable"
            >
              {resolvedDescription}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-6 sm:px-8">
          <p id={supportingTextId} className="text-body-sm text-muted-readable">
            {DEFAULT_SUPPORTING_TEXT}
          </p>
        </CardContent>

        <CardFooter className="justify-center px-6 pb-8 pt-2 sm:px-8 sm:pb-10">
          <Button asChild variant="outline">
            <Link href={resolvedBackHref}>
              <ArrowLeft
                aria-hidden="true"
                data-icon="inline-start"
                className="size-4"
              />
              {resolvedBackLabel}
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
}

export default ComingSoon;
