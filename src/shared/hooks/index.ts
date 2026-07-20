// oz-next-app/src/shared/hooks/index.ts
export {
  useDebounce,
  type UseDebounceOptions,
} from "@/shared/hooks/use-debounce";

export {
  useIsMobile,
  useMediaQuery,
  usePrefersReducedMotion,
  useViewportKind,
  VIEWPORT_BREAKPOINTS,
  type ViewportKind,
} from "@/shared/hooks/use-mobile";

export {
  toast,
  useToast,
  type BannerOptions,
  type ProblemToastOptions,
  type SonnerPosition,
  type ToastApi,
  type ToastId,
  type ToastMessageOptions,
  type ToastOptions,
  type ToastType,
} from "@/shared/hooks/use-toast";
