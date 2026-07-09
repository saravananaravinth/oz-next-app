// oz-next-app/src/components/ui/calendar.tsx
"use client";

import * as React from "react";
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
} from "react-day-picker";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CalendarProps = React.ComponentProps<typeof DayPicker> &
  Readonly<{
    buttonVariant?: React.ComponentProps<typeof Button>["variant"];
  }>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  locale,
  formatters,
  components,
  ...props
}: CalendarProps): React.ReactElement {
  const defaultClassNames = getDefaultClassNames();
  const localeCode = locale?.code;

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "group/calendar bg-background p-2 [--cell-radius:var(--radius-md)] [--cell-size:--spacing(7)] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString(localeCode, { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4 md:flex-row",
          defaultClassNames.months,
        ),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-[var(--cell-size)] p-0 select-none aria-disabled:opacity-50",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-[var(--cell-size)] p-0 select-none aria-disabled:opacity-50",
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          "flex h-[var(--cell-size)] w-full items-center justify-center px-[var(--cell-size)]",
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          "flex h-[var(--cell-size)] w-full items-center justify-center gap-1.5 text-body-sm [font-weight:var(--typography-emphasis-weight)]",
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          "relative rounded-[var(--cell-radius)]",
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn(
          "absolute inset-0 bg-popover opacity-0",
          defaultClassNames.dropdown,
        ),
        caption_label: cn(
          "select-none [font-weight:var(--typography-emphasis-weight)]",
          captionLayout === "label"
            ? "text-body-sm"
            : "flex items-center gap-1 rounded-[var(--cell-radius)] text-body-sm [&>svg]:size-3.5 [&>svg]:text-muted-readable",
          defaultClassNames.caption_label,
        ),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex-1 rounded-[var(--cell-radius)] text-caption text-muted-readable select-none",
          defaultClassNames.weekday,
        ),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        week_number_header: cn(
          "w-[var(--cell-size)] select-none",
          defaultClassNames.week_number_header,
        ),
        week_number: cn(
          "text-caption text-muted-readable select-none",
          defaultClassNames.week_number,
        ),
        day: cn(
          "group/day relative aspect-square h-full w-full rounded-[var(--cell-radius)] p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-[var(--cell-radius)]",
          props.showWeekNumber
            ? "[&:nth-child(2)[data-selected=true]_button]:rounded-l-[var(--cell-radius)]"
            : "[&:first-child[data-selected=true]_button]:rounded-l-[var(--cell-radius)]",
          defaultClassNames.day,
        ),
        range_start: cn(
          "relative isolate z-0 rounded-l-[var(--cell-radius)] bg-muted after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-muted",
          defaultClassNames.range_start,
        ),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn(
          "relative isolate z-0 rounded-r-[var(--cell-radius)] bg-muted after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-muted",
          defaultClassNames.range_end,
        ),
        today: cn(
          "rounded-[var(--cell-radius)] bg-muted text-foreground data-[selected=true]:rounded-none",
          defaultClassNames.today,
        ),
        outside: cn(
          "text-muted-readable aria-selected:text-muted-readable",
          defaultClassNames.outside,
        ),
        disabled: cn(
          "text-muted-readable opacity-50",
          defaultClassNames.disabled,
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className: rootClassName, rootRef, ...rootProps }) => (
          <div
            data-slot="calendar"
            ref={rootRef}
            className={cn(rootClassName)}
            {...rootProps}
          />
        ),
        Chevron: ({
          className: chevronClassName,
          orientation,
          ...chevronProps
        }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon
                className={cn("size-4", chevronClassName)}
                aria-hidden="true"
                {...chevronProps}
              />
            );
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4", chevronClassName)}
                aria-hidden="true"
                {...chevronProps}
              />
            );
          }

          return (
            <ChevronDownIcon
              className={cn("size-4", chevronClassName)}
              aria-hidden="true"
              {...chevronProps}
            />
          );
        },
        DayButton: (dayButtonProps) => (
          <CalendarDayButton localeCode={localeCode} {...dayButtonProps} />
        ),
        WeekNumber: ({ children, ...weekNumberProps }) => (
          <td {...weekNumberProps}>
            <div className="flex size-[var(--cell-size)] items-center justify-center text-center text-tabular">
              {children}
            </div>
          </td>
        ),
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  localeCode,
  ...props
}: React.ComponentProps<typeof DayButton> & {
  localeCode?: string | undefined;
}): React.ReactElement {
  const defaultClassNames = getDefaultClassNames();
  const ref = React.useRef<HTMLButtonElement>(null);
  const selected = modifiers["selected"] === true;
  const rangeStart = modifiers["range_start"] === true;
  const rangeEnd = modifiers["range_end"] === true;
  const rangeMiddle = modifiers["range_middle"] === true;

  React.useEffect(() => {
    if (modifiers["focused"] === true) {
      ref.current?.focus();
    }
  }, [modifiers]);

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString(localeCode)}
      data-selected-single={
        selected && !rangeStart && !rangeEnd && !rangeMiddle
      }
      data-range-start={rangeStart}
      data-range-end={rangeEnd}
      data-range-middle={rangeMiddle}
      className={cn(
        "relative isolate z-10 flex aspect-square size-auto w-full min-w-[var(--cell-size)] flex-col gap-1 border-0 text-tabular group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-3 group-data-[focused=true]/day:ring-ring/50 data-[range-end=true]:rounded-[var(--cell-radius)] data-[range-end=true]:rounded-r-[var(--cell-radius)] data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-muted data-[range-middle=true]:text-foreground data-[range-start=true]:rounded-[var(--cell-radius)] data-[range-start=true]:rounded-l-[var(--cell-radius)] data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground dark:hover:text-foreground [&>span]:text-caption [&>span]:opacity-70",
        "[font-weight:var(--typography-body-weight)]",
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
