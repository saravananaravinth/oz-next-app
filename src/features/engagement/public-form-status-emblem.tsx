// oz-next-app/src/features/engagement/public-form-status-emblem.tsx
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ReactElement } from "react";

import { cn } from "@/lib/utils";

type PublicFormStatusEmblemProps = Readonly<{
  status: "success" | "error";
  className?: string;
}>;

export function PublicFormStatusEmblem({
  status,
  className,
}: PublicFormStatusEmblemProps): ReactElement {
  const success = status === "success";
  const Icon = success ? CheckCircle2 : AlertTriangle;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-16 items-center justify-center justify-self-center rounded-3xl border shadow-xs",
        success
          ? "border-success/25 bg-success/10 text-success"
          : "border-destructive/20 bg-destructive/8 text-destructive",
        className,
      )}
    >
      <Icon className="size-8" />
    </span>
  );
}
