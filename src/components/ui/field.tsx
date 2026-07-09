// oz-next-app/src/components/ui/field.tsx
import type { ComponentProps, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type FieldLegendVariant = "legend" | "label";

type FieldErrorItem = Readonly<{
  message?: string | undefined;
}>;

type FieldSetProps = ComponentProps<"fieldset">;

type FieldLegendProps = ComponentProps<"legend"> &
  Readonly<{
    variant?: FieldLegendVariant;
  }>;

type FieldGroupProps = ComponentProps<"div">;
type FieldContentProps = ComponentProps<"div">;
type FieldLabelProps = ComponentProps<typeof Label>;
type FieldTitleProps = ComponentProps<"div">;
type FieldDescriptionProps = ComponentProps<"p">;

type FieldSeparatorProps = ComponentProps<"div"> &
  Readonly<{
    children?: ReactNode;
  }>;

type FieldErrorProps = ComponentProps<"div"> &
  Readonly<{
    errors?: ReadonlyArray<FieldErrorItem | null | undefined>;
  }>;

const DEFAULT_FIELD_LEGEND_VARIANT = "legend" satisfies FieldLegendVariant;
const DEFAULT_FIELD_ORIENTATION = "vertical" satisfies FieldOrientation;
const MAX_FIELD_ERROR_MESSAGE_LENGTH = 320;
const CONTROL_CHARACTER_DELETE = 127;
const CONTROL_CHARACTER_MAX_CODE_POINT = 31;

const FIELD_SET_CLASS_NAME =
  "flex min-w-0 flex-col gap-4 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3";

const FIELD_LEGEND_CLASS_NAME =
  "mb-1.5 text-foreground data-[variant=label]:text-body-sm data-[variant=legend]:text-card-title";

const FIELD_GROUP_CLASS_NAME =
  "group/field-group @container/field-group flex w-full min-w-0 flex-col gap-5 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4";

const FIELD_CONTENT_CLASS_NAME =
  "group/field-content flex min-w-0 flex-1 flex-col gap-0.5";

const FIELD_LABEL_CLASS_NAME = cn(
  "group/field-label peer/field-label flex w-fit gap-2 text-body-sm",
  "group-data-[disabled=true]/field:opacity-50",
  "has-data-[state=checked]:border-primary/30 has-data-[state=checked]:bg-primary/5",
  "has-data-[state=indeterminate]:border-primary/30 has-data-[state=indeterminate]:bg-primary/5",
  "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col",
  "has-[>[data-slot=field]]:rounded-lg has-[>[data-slot=field]]:border",
  "*:data-[slot=field]:p-2.5",
  "dark:has-data-[state=checked]:border-primary/20 dark:has-data-[state=checked]:bg-primary/10",
  "dark:has-data-[state=indeterminate]:border-primary/20 dark:has-data-[state=indeterminate]:bg-primary/10",
);

const FIELD_TITLE_CLASS_NAME =
  "flex w-fit items-center gap-2 text-body-sm group-data-[disabled=true]/field:opacity-50";

const FIELD_DESCRIPTION_CLASS_NAME = cn(
  "text-left text-body-sm text-muted-readable",
  "group-data-[orientation=horizontal]/field:text-balance [[data-variant=legend]+&]:-mt-1.5",
  "last:mt-0 nth-last-2:-mt-1",
  "[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
);

const FIELD_SEPARATOR_CLASS_NAME =
  "relative -my-2 h-5 text-caption group-data-[variant=outline]/field-group:-mb-2";

const FIELD_SEPARATOR_CONTENT_CLASS_NAME =
  "relative mx-auto block w-fit bg-background px-2 text-muted-readable";

const FIELD_ERROR_CLASS_NAME = "text-body-sm text-destructive";

const fieldVariants = cva(
  "group/field flex w-full min-w-0 gap-2 data-[invalid=true]:text-destructive aria-invalid:text-destructive",
  {
    variants: {
      orientation: {
        vertical: "flex-col *:w-full [&>.sr-only]:w-auto",
        horizontal:
          "flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
        responsive:
          "flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
      },
    },
    defaultVariants: {
      orientation: "vertical",
    },
  },
);

type FieldOrientation = NonNullable<
  VariantProps<typeof fieldVariants>["orientation"]
>;

type FieldProps = ComponentProps<"div"> &
  Readonly<{
    orientation?: FieldOrientation;
  }>;

function isRenderableNode(value: ReactNode | undefined): boolean {
  return (
    value !== undefined &&
    value !== null &&
    typeof value !== "boolean" &&
    value !== ""
  );
}

function truncateMessage(value: string): string {
  if (value.length <= MAX_FIELD_ERROR_MESSAGE_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_FIELD_ERROR_MESSAGE_LENGTH - 1).trimEnd()}…`;
}

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

function normalizeErrorMessage(message: string | undefined): string | null {
  const normalized =
    message === undefined
      ? undefined
      : replaceControlCharacters(message).trim();

  if (normalized === undefined || normalized.length === 0) {
    return null;
  }

  return truncateMessage(normalized);
}

function uniqueErrorMessages(
  errors: ReadonlyArray<FieldErrorItem | null | undefined> | undefined,
): readonly string[] {
  if (errors === undefined || errors.length === 0) {
    return [];
  }

  const messages: string[] = [];
  const seenMessages = new Set<string>();

  for (const error of errors) {
    const message = normalizeErrorMessage(error?.message);

    if (message !== null && !seenMessages.has(message)) {
      seenMessages.add(message);
      messages.push(message);
    }
  }

  return messages;
}

function fieldErrorContent(
  children: ReactNode | undefined,
  errors: ReadonlyArray<FieldErrorItem | null | undefined> | undefined,
): ReactNode {
  if (isRenderableNode(children)) {
    return children;
  }

  const messages = uniqueErrorMessages(errors);

  if (messages.length === 0) {
    return null;
  }

  if (messages.length === 1) {
    const [message] = messages;

    return message ?? null;
  }

  return (
    <ul className="ml-4 flex list-disc flex-col gap-1">
      {messages.map((message) => (
        <li key={message}>{message}</li>
      ))}
    </ul>
  );
}

function FieldSet({ className, ...props }: FieldSetProps) {
  return (
    <fieldset
      {...props}
      data-slot="field-set"
      className={cn(FIELD_SET_CLASS_NAME, className)}
    />
  );
}

function FieldLegend({
  className,
  variant = DEFAULT_FIELD_LEGEND_VARIANT,
  ...props
}: FieldLegendProps) {
  return (
    <legend
      {...props}
      data-slot="field-legend"
      data-variant={variant}
      className={cn(FIELD_LEGEND_CLASS_NAME, className)}
    />
  );
}

function FieldGroup({ className, ...props }: FieldGroupProps) {
  return (
    <div
      {...props}
      data-slot="field-group"
      className={cn(FIELD_GROUP_CLASS_NAME, className)}
    />
  );
}

function Field({
  className,
  orientation = DEFAULT_FIELD_ORIENTATION,
  role = "group",
  ...props
}: FieldProps) {
  return (
    <div
      {...props}
      role={role}
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
    />
  );
}

function FieldContent({ className, ...props }: FieldContentProps) {
  return (
    <div
      {...props}
      data-slot="field-content"
      className={cn(FIELD_CONTENT_CLASS_NAME, className)}
    />
  );
}

function FieldLabel({ className, ...props }: FieldLabelProps) {
  return (
    <Label
      {...props}
      data-slot="field-label"
      className={cn(FIELD_LABEL_CLASS_NAME, className)}
    />
  );
}

function FieldTitle({ className, ...props }: FieldTitleProps) {
  return (
    <div
      {...props}
      data-slot="field-label"
      className={cn(FIELD_TITLE_CLASS_NAME, className)}
    />
  );
}

function FieldDescription({ className, ...props }: FieldDescriptionProps) {
  return (
    <p
      {...props}
      data-slot="field-description"
      className={cn(FIELD_DESCRIPTION_CLASS_NAME, className)}
    />
  );
}

function FieldSeparator({
  children,
  className,
  ...props
}: FieldSeparatorProps) {
  const hasContent = isRenderableNode(children);

  return (
    <div
      {...props}
      data-slot="field-separator"
      data-content={hasContent}
      className={cn(FIELD_SEPARATOR_CLASS_NAME, className)}
    >
      <Separator className="absolute inset-0 top-1/2" />
      {hasContent ? (
        <span
          data-slot="field-separator-content"
          className={FIELD_SEPARATOR_CONTENT_CLASS_NAME}
        >
          {children}
        </span>
      ) : null}
    </div>
  );
}

function FieldError({
  className,
  children,
  errors,
  role = "alert",
  "aria-live": ariaLive = "polite",
  "aria-atomic": ariaAtomic = true,
  ...props
}: FieldErrorProps) {
  const content = fieldErrorContent(children, errors);

  if (!isRenderableNode(content)) {
    return null;
  }

  return (
    <div
      {...props}
      role={role}
      aria-live={ariaLive}
      aria-atomic={ariaAtomic}
      data-slot="field-error"
      className={cn(FIELD_ERROR_CLASS_NAME, className)}
    >
      {content}
    </div>
  );
}

export {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
};
export type {
  FieldContentProps,
  FieldDescriptionProps,
  FieldErrorItem,
  FieldErrorProps,
  FieldGroupProps,
  FieldLabelProps,
  FieldLegendProps,
  FieldLegendVariant,
  FieldOrientation,
  FieldProps,
  FieldSeparatorProps,
  FieldSetProps,
  FieldTitleProps,
};
