// oz-next-app/src/features/auth/components/login-brand-mark.tsx
import Image from "next/image";

const BRAND_ICON_SIZE = 48;
const BRAND_ICON_SIZE_CLASS_NAME = "h-11 w-auto";

export function LoginBrandMark() {
  return (
    <div aria-hidden="true" className="flex items-center justify-center">
      <Image
        src="/logo-light.svg"
        alt=""
        width={BRAND_ICON_SIZE}
        height={BRAND_ICON_SIZE}
        className={`block ${BRAND_ICON_SIZE_CLASS_NAME} dark:hidden`}
        priority
      />
      <Image
        src="/logo-dark.svg"
        alt=""
        width={BRAND_ICON_SIZE}
        height={BRAND_ICON_SIZE}
        className={`hidden ${BRAND_ICON_SIZE_CLASS_NAME} dark:block`}
        priority
      />
    </div>
  );
}
