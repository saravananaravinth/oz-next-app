// oz-next-app/src/features/engagement/dealer-dashboard/components/dashboard-quick-range-select.tsx
"use client";

import { Clock3, LoaderCircle } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import * as React from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type DashboardQuickRangeValue = "all" | "7" | "30" | "90" | "custom";

export type DashboardQuickRangeOption = Readonly<{
  value: Exclude<DashboardQuickRangeValue, "custom">;
  label: string;
  href: Route;
}>;

export type DashboardQuickRangeSelectProps = Readonly<{
  value: DashboardQuickRangeValue;
  options: readonly DashboardQuickRangeOption[];
}>;

export function DashboardQuickRangeSelect({
  value,
  options,
}: DashboardQuickRangeSelectProps): React.ReactElement {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const handleValueChange = React.useCallback(
    (nextValue: string): void => {
      const option = options.find((candidate) => candidate.value === nextValue);

      if (option === undefined) {
        return;
      }

      startTransition(() => {
        router.push(option.href, { scroll: false });
      });
    },
    [options, router],
  );

  return (
    <Select value={value} onValueChange={handleValueChange} disabled={pending}>
      <SelectTrigger
        aria-label="Quick activity range"
        className="w-full sm:w-48"
      >
        {pending ? (
          <LoaderCircle
            aria-hidden="true"
            className="size-4 animate-spin motion-reduce:animate-none"
          />
        ) : (
          <Clock3 aria-hidden="true" className="size-4" />
        )}
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {value === "custom" ? (
          <SelectItem value="custom" disabled>
            Custom period
          </SelectItem>
        ) : null}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
