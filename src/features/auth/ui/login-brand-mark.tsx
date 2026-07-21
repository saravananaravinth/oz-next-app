// oz-next-app/src/features/auth/ui/login-brand-mark.tsx
import Image from "next/image";

import {
  BRAND_LOGO_INTRINSIC_HEIGHT,
  BRAND_LOGO_INTRINSIC_WIDTH,
} from "@/components/common/brand-assets";

const BRAND_ICON_SIZE_CLASS_NAME = "h-11 w-auto";

export function LoginBrandMark() {
  return (
    <div aria-hidden="true" className="flex items-center justify-center">
      <Image
        src="/logo-light.svg"
        alt=""
        width={BRAND_LOGO_INTRINSIC_WIDTH}
        height={BRAND_LOGO_INTRINSIC_HEIGHT}
        className={`block ${BRAND_ICON_SIZE_CLASS_NAME} dark:hidden`}
        priority
      />
      <Image
        src="/logo-dark.svg"
        alt=""
        width={BRAND_LOGO_INTRINSIC_WIDTH}
        height={BRAND_LOGO_INTRINSIC_HEIGHT}
        className={`hidden ${BRAND_ICON_SIZE_CLASS_NAME} dark:block`}
        priority
      />
    </div>
  );
}
