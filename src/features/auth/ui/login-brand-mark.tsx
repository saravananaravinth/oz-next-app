// oz-next-app/src/features/auth/ui/login-brand-mark.tsx
import type { ReactElement } from "react";

const BRAND_LOGO_CLASS_NAME =
  "block h-11 w-[11.25rem] bg-[url('/logo-light.svg')] bg-contain bg-center bg-no-repeat dark:bg-[url('/logo-dark.svg')] forced-colors:hidden";

export function LoginBrandMark(): ReactElement {
  return (
    <div
      data-slot="login-brand-mark"
      aria-hidden="true"
      className="flex min-h-11 items-center justify-center"
    >
      <span className={BRAND_LOGO_CLASS_NAME} />
      <span className="hidden text-section-title forced-colors:block">
        Ozotec EV
      </span>
    </div>
  );
}
