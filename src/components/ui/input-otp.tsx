// oz-next-app/src/components/ui/input-otp.tsx
"use client";

import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { MinusIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type InputOTPProps = React.ComponentProps<typeof OTPInput> &
  Readonly<{
    containerClassName?: string;
  }>;

type InputOTPGroupProps = React.ComponentProps<"div">;

type InputOTPSlotProps = React.ComponentProps<"div"> &
  Readonly<{
    index: number;
  }>;

type InputOTPSeparatorProps = React.ComponentProps<"div">;

function InputOTP({ className, containerClassName, ...props }: InputOTPProps) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        "flex items-center justify-center gap-2 has-disabled:opacity-50",
        containerClassName,
      )}
      spellCheck={false}
      className={cn(
        "disabled:cursor-not-allowed disabled:opacity-70",
        className,
      )}
      {...props}
    />
  );
}

function InputOTPGroup({ className, ...props }: InputOTPGroupProps) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn(
        "flex items-center justify-center rounded-2xl shadow-sm has-aria-invalid:ring-3 has-aria-invalid:ring-destructive/20 dark:has-aria-invalid:ring-destructive/40",
        className,
      )}
      {...props}
    />
  );
}

function InputOTPSlot({ index, className, ...props }: InputOTPSlotProps) {
  const inputOTPContext = React.useContext(OTPInputContext);
  const slot = index >= 0 ? inputOTPContext.slots[index] : undefined;
  const char = slot?.char ?? null;
  const hasFakeCaret = slot?.hasFakeCaret === true;
  const isActive = slot?.isActive === true;

  return (
    <div
      aria-hidden="true"
      data-active={isActive}
      data-slot="input-otp-slot"
      className={cn(
        [
          "relative flex size-11 shrink-0 items-center justify-center border-y border-r border-input bg-background/85 text-center text-card-title text-tabular text-foreground shadow-sm outline-none",
          "transition-[background-color,border-color,box-shadow,transform] duration-200 motion-reduce:transition-none",
          "first:rounded-l-2xl first:border-l last:rounded-r-2xl",
          "aria-invalid:border-destructive",
          "data-[active=true]:z-10 data-[active=true]:border-ring data-[active=true]:bg-background data-[active=true]:ring-3 data-[active=true]:ring-ring/25 data-[active=true]:shadow-md",
          "data-[active=true]:aria-invalid:border-destructive data-[active=true]:aria-invalid:ring-destructive/20",
          "dark:bg-input/30 dark:data-[active=true]:bg-input/45 dark:data-[active=true]:aria-invalid:ring-destructive/40",
          "sm:size-12",
        ].join(" "),
        className,
      )}
      {...props}
    >
      {char}
      {hasFakeCaret ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-px animate-caret-blink rounded-full bg-foreground duration-1000 motion-reduce:animate-none" />
        </div>
      ) : null}
    </div>
  );
}

function InputOTPSeparator({ className, ...props }: InputOTPSeparatorProps) {
  return (
    <div
      aria-hidden="true"
      data-slot="input-otp-separator"
      className={cn(
        "flex items-center justify-center px-0.5 text-muted-readable",
        className,
      )}
      {...props}
    >
      <MinusIcon aria-hidden="true" className="size-4" strokeWidth={1.75} />
    </div>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot };
export type {
  InputOTPGroupProps,
  InputOTPProps,
  InputOTPSeparatorProps,
  InputOTPSlotProps,
};
