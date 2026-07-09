// oz-next-app/src/components/ui/slider.tsx
"use client";

import * as React from "react";
import { Slider as SliderPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

type SliderProps = Omit<
  React.ComponentProps<typeof SliderPrimitive.Root>,
  "value" | "defaultValue"
> &
  Readonly<{
    value?: number[];
    defaultValue?: number[];
  }>;

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: SliderProps): React.ReactElement {
  const values = React.useMemo(() => {
    if (Array.isArray(value) && value.length > 0) {
      return value;
    }

    if (Array.isArray(defaultValue) && defaultValue.length > 0) {
      return defaultValue;
    }

    return [min, max];
  }, [defaultValue, max, min, value]);

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      {...(defaultValue !== undefined ? { defaultValue } : {})}
      {...(value !== undefined ? { value } : {})}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-40 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative grow overflow-hidden rounded-full bg-muted data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5 data-horizontal:h-1.5 data-horizontal:w-full data-vertical:h-full data-vertical:w-1.5"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute bg-primary select-none data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full data-horizontal:h-full data-vertical:w-full"
        />
      </SliderPrimitive.Track>
      {values.map((_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="relative block size-4 shrink-0 rounded-full border border-primary/70 bg-background shadow-sm ring-ring/40 transition-[background-color,border-color,box-shadow,transform] duration-200 select-none after:absolute after:-inset-2 hover:ring-[3px] focus-visible:ring-[3px] focus-visible:outline-none active:scale-95 active:ring-[3px] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100"
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
