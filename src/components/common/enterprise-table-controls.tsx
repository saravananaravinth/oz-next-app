// oz-next-app/src/components/common/enterprise-table-controls.tsx
"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Columns3, Rows3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const ENTERPRISE_TABLE_DENSITIES = [
  "compact",
  "normal",
  "comfortable",
] as const;

export type EnterpriseTableDensity =
  (typeof ENTERPRISE_TABLE_DENSITIES)[number];

export type EnterpriseTableColumn = Readonly<{
  id: string;
  label: string;
  hideable?: boolean;
  reorderable?: boolean;
}>;

export type EnterpriseTableControlsProps = Readonly<{
  density: EnterpriseTableDensity;
  onDensityChange: (density: EnterpriseTableDensity) => void;
  columns: readonly EnterpriseTableColumn[];
  columnOrder: readonly string[];
  visibleColumnIds: ReadonlySet<string>;
  onColumnVisibilityChange: (columnId: string, visible: boolean) => void;
  onColumnMove: (columnId: string, direction: "up" | "down") => void;
  onResetColumns: () => void;
}>;

function densityLabel(density: EnterpriseTableDensity): string {
  switch (density) {
    case "compact":
      return "Compact";
    case "normal":
      return "Normal";
    case "comfortable":
      return "Comfortable";
  }
}

export function EnterpriseTableControls({
  density,
  onDensityChange,
  columns,
  columnOrder,
  visibleColumnIds,
  onColumnVisibilityChange,
  onColumnMove,
  onResetColumns,
}: EnterpriseTableControlsProps): React.ReactElement {
  const columnById = React.useMemo(
    () => new Map(columns.map((column) => [column.id, column])),
    [columns],
  );
  const orderedColumns = React.useMemo(
    () =>
      columnOrder
        .map((columnId) => columnById.get(columnId))
        .filter(
          (column): column is EnterpriseTableColumn => column !== undefined,
        ),
    [columnById, columnOrder],
  );

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Select
        value={density}
        onValueChange={(value) => {
          const next = ENTERPRISE_TABLE_DENSITIES.find(
            (candidate) => candidate === value,
          );
          if (next !== undefined) onDensityChange(next);
        }}
      >
        <SelectTrigger
          size="compact"
          className="w-[9.25rem]"
          aria-label="Table density"
        >
          <Rows3 aria-hidden="true" className="size-3.5" />
          <SelectValue placeholder={undefined}>
            {densityLabel(density)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {ENTERPRISE_TABLE_DENSITIES.map((candidate) => (
            <SelectItem key={candidate} value={candidate}>
              {densityLabel(candidate)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-9">
            <Columns3 aria-hidden="true" className="size-4" />
            Columns
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-[22rem] p-0"
          aria-label="Configure table columns"
        >
          <div className="border-b border-border/70 px-4 py-3">
            <div className="text-body-sm font-medium">Table columns</div>
            <p className="mt-0.5 text-caption text-muted-readable">
              Choose visible columns and change their workflow order.
            </p>
          </div>

          <div className="grid max-h-[22rem] gap-1 overflow-y-auto p-2">
            {orderedColumns.map((column, index) => {
              const visible = visibleColumnIds.has(column.id);
              const hideable = column.hideable !== false;
              const reorderable = column.reorderable !== false;
              return (
                <div
                  key={column.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-muted/60"
                >
                  <Checkbox
                    checked={visible}
                    disabled={!hideable}
                    aria-label={`${visible ? "Hide" : "Show"} ${column.label} column`}
                    onCheckedChange={(checked) => {
                      if (hideable) {
                        onColumnVisibilityChange(column.id, checked === true);
                      }
                    }}
                  />
                  <span className="truncate text-body-sm">{column.label}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={!reorderable || index === 0}
                    aria-label={`Move ${column.label} left`}
                    onClick={() => {
                      onColumnMove(column.id, "up");
                    }}
                  >
                    <ArrowUp aria-hidden="true" className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={
                      !reorderable || index === orderedColumns.length - 1
                    }
                    aria-label={`Move ${column.label} right`}
                    onClick={() => {
                      onColumnMove(column.id, "down");
                    }}
                  >
                    <ArrowDown aria-hidden="true" className="size-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="border-t border-border/70 p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-center"
              onClick={onResetColumns}
            >
              Reset columns
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
