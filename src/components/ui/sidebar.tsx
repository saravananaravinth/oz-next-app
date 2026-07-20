// oz-next-app/src/components/ui/sidebar.tsx
"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { PanelLeftIcon } from "lucide-react";
import { Slot } from "radix-ui";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/lib/utils";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_COOKIE_SAMESITE = "Lax";
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";
const SIDEBAR_MENU_SKELETON_WIDTH = "72%";

const EDITABLE_SHORTCUT_TARGETS = new Set<string>([
  "INPUT",
  "TEXTAREA",
  "SELECT",
]);

type SidebarState = "expanded" | "collapsed";
type SidebarSide = "left" | "right";
type SidebarVariant = "sidebar" | "floating" | "inset";
type SidebarCollapsible = "offcanvas" | "icon" | "none";

type SidebarContextProps = Readonly<{
  state: SidebarState;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openMobile: boolean;
  setOpenMobile: React.Dispatch<React.SetStateAction<boolean>>;
  isMobile: boolean;
  toggleSidebar: () => void;
}>;

type SidebarProviderProps = React.ComponentProps<"div"> &
  Readonly<{
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }>;

type SidebarProps = React.ComponentProps<"div"> &
  Readonly<{
    side?: SidebarSide;
    variant?: SidebarVariant;
    collapsible?: SidebarCollapsible;
  }>;

type SidebarMenuButtonProps = React.ComponentProps<"button"> &
  Readonly<{
    asChild?: boolean;
    isActive?: boolean;
    tooltip?: string | React.ComponentProps<typeof TooltipContent>;
  }> &
  VariantProps<typeof sidebarMenuButtonVariants>;

type SidebarMenuSubButtonProps = React.ComponentProps<"a"> &
  Readonly<{
    asChild?: boolean;
    size?: "sm" | "md";
    isActive?: boolean;
  }>;

type SidebarWidthStyle = React.CSSProperties &
  Readonly<{
    "--sidebar-width": string;
  }>;

type SidebarProviderStyle = SidebarWidthStyle &
  Readonly<{
    "--sidebar-width-icon": string;
  }>;

type SidebarSkeletonTextStyle = React.CSSProperties &
  Readonly<{
    "--skeleton-width": string;
  }>;

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

function createSidebarProviderStyle(
  style: React.CSSProperties | undefined,
): SidebarProviderStyle {
  return {
    "--sidebar-width": SIDEBAR_WIDTH,
    "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
    ...style,
  };
}

function createSidebarMobileStyle(
  style: React.CSSProperties | undefined,
): SidebarWidthStyle {
  return {
    "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
    ...style,
  };
}

function createSidebarSkeletonTextStyle(
  width: string,
): SidebarSkeletonTextStyle {
  return {
    "--skeleton-width": width,
  };
}

function canUseSecurePreferenceCookie(): boolean {
  return typeof window !== "undefined" && window.location.protocol === "https:";
}

function writeSidebarStateCookie(open: boolean): void {
  if (typeof document === "undefined") {
    return;
  }

  const secureAttribute = canUseSecurePreferenceCookie() ? "; Secure" : "";
  const value = open ? "true" : "false";

  try {
    document.cookie = [
      `${SIDEBAR_COOKIE_NAME}=${value}`,
      "Path=/",
      `Max-Age=${String(SIDEBAR_COOKIE_MAX_AGE)}`,
      `SameSite=${SIDEBAR_COOKIE_SAMESITE}`,
      secureAttribute.trim(),
    ]
      .filter((attribute) => attribute.length > 0)
      .join("; ");
  } catch {
    // Preference cookies can be unavailable in hardened browser contexts.
  }
}

function isEditableShortcutTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  if (EDITABLE_SHORTCUT_TARGETS.has(target.tagName)) {
    return true;
  }

  return target.closest('[contenteditable="true"]') !== null;
}

function shouldHandleSidebarShortcut(event: KeyboardEvent): boolean {
  return (
    !event.defaultPrevented &&
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === SIDEBAR_KEYBOARD_SHORTCUT &&
    !isEditableShortcutTarget(event.target)
  );
}

function useSidebar() {
  const context = React.useContext(SidebarContext);

  if (context === null) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }

  return context;
}

function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}: SidebarProviderProps) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);
  const [_open, _setOpen] = React.useState(defaultOpen);
  const open = openProp ?? _open;

  const setOpen = React.useCallback<
    React.Dispatch<React.SetStateAction<boolean>>
  >(
    (value) => {
      const openState = typeof value === "function" ? value(open) : value;

      if (setOpenProp !== undefined) {
        setOpenProp(openState);
      } else {
        _setOpen(openState);
      }

      writeSidebarStateCookie(openState);
    },
    [open, setOpenProp],
  );

  const toggleSidebar = React.useCallback((): void => {
    if (isMobile) {
      setOpenMobile((currentOpen) => !currentOpen);
      return;
    }

    setOpen((currentOpen) => !currentOpen);
  }, [isMobile, setOpen]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!shouldHandleSidebarShortcut(event)) {
        return;
      }

      event.preventDefault();
      toggleSidebar();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleSidebar]);

  const state: SidebarState = open ? "expanded" : "collapsed";

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        data-slot="sidebar-wrapper"
        style={createSidebarProviderStyle(style)}
        className={cn(
          "group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  dir,
  style,
  ...props
}: SidebarProps) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

  if (collapsible === "none") {
    return (
      <div
        data-slot="sidebar"
        data-sidebar="sidebar"
        dir={dir}
        style={style}
        className={cn(
          "flex h-full w-(--sidebar-width) flex-col border-sidebar-border bg-sidebar text-sidebar-foreground",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          data-sidebar="sidebar"
          data-mobile="true"
          dir={dir}
          side={side}
          showCloseButton={false}
          style={createSidebarMobileStyle(style)}
          className={cn(
            "w-(--sidebar-width) border-sidebar-border bg-sidebar/95 p-0 text-sidebar-foreground shadow-2xl supports-backdrop-filter:bg-sidebar/90 supports-backdrop-filter:backdrop-blur-xl",
            className,
          )}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>
              Displays the mobile navigation sidebar.
            </SheetDescription>
          </SheetHeader>
          <div
            data-slot="sidebar"
            data-sidebar="sidebar"
            dir={dir}
            className="flex h-full w-full min-w-0 flex-col"
            {...props}
          >
            {children}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      data-slot="sidebar"
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : undefined}
      data-variant={variant}
      data-side={side}
      dir={dir}
      className="group peer hidden text-sidebar-foreground md:block"
    >
      <div
        data-slot="sidebar-gap"
        className={cn(
          "relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-out",
          "group-data-[collapsible=offcanvas]:w-0",
          "group-data-[side=right]:rotate-180",
          variant === "floating" || variant === "inset"
            ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_1rem)]"
            : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
        )}
      />
      <div
        data-slot="sidebar-container"
        data-side={side}
        style={style}
        className={cn(
          "fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-out data-[side=left]:left-0 data-[side=left]:group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)_*_-1)] data-[side=right]:right-0 data-[side=right]:group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)_*_-1)] md:flex",
          variant === "floating" || variant === "inset"
            ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_1rem_+_2px)]"
            : "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l",
          className,
        )}
        {...props}
      >
        <div
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
          className="flex size-full min-w-0 flex-col bg-sidebar group-data-[variant=floating]:rounded-3xl group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border/70 group-data-[variant=floating]:shadow-sm group-data-[variant=floating]:ring-1 group-data-[variant=floating]:ring-sidebar-border/60 group-data-[variant=inset]:rounded-3xl group-data-[variant=inset]:border group-data-[variant=inset]:border-sidebar-border/70 group-data-[variant=inset]:shadow-sm"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function SidebarTrigger({
  className,
  onClick,
  "aria-label": ariaLabel = "Toggle sidebar",
  ...props
}: React.ComponentProps<typeof Button>) {
  const { isMobile, open, openMobile, toggleSidebar } = useSidebar();

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon-sm"
      aria-label={ariaLabel}
      aria-expanded={isMobile ? openMobile : open}
      className={cn(className)}
      onClick={(event) => {
        onClick?.(event);

        if (!event.defaultPrevented) {
          toggleSidebar();
        }
      }}
      {...props}
    >
      <PanelLeftIcon aria-hidden="true" />
      <span className="sr-only">Toggle sidebar</span>
    </Button>
  );
}

function SidebarRail({
  className,
  type,
  title = "Toggle sidebar",
  "aria-label": ariaLabel = "Toggle sidebar",
  ...props
}: React.ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar();

  return (
    <button
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label={ariaLabel}
      onClick={toggleSidebar}
      title={title}
      type={type ?? "button"}
      className={cn(
        "absolute inset-y-0 z-20 hidden w-4 rounded-full outline-hidden transition-[background-color,opacity,transform] duration-200 ease-out group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-2 after:start-1/2 after:w-[2px] after:rounded-full hover:after:bg-sidebar-border focus-visible:ring-2 focus-visible:ring-sidebar-ring/60 sm:flex ltr:-translate-x-1/2 rtl:-translate-x-1/2",
        "in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full hover:group-data-[collapsible=offcanvas]:bg-sidebar-accent/60",
        "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
        "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        className,
      )}
      {...props}
    />
  );
}

function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(
        "relative flex w-full min-w-0 flex-1 flex-col bg-background md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:overflow-hidden md:peer-data-[variant=inset]:rounded-3xl md:peer-data-[variant=inset]:border md:peer-data-[variant=inset]:border-border/60 md:peer-data-[variant=inset]:shadow-sm md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2",
        className,
      )}
      {...props}
    />
  );
}

function SidebarInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      data-slot="sidebar-input"
      data-sidebar="input"
      className={cn(
        "h-9 rounded-xl bg-background/80 text-body-sm shadow-none",
        className,
      )}
      {...props}
    />
  );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn("flex min-w-0 flex-col gap-2 p-2", className)}
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn("flex min-w-0 flex-col gap-2 p-2", className)}
      {...props}
    />
  );
}

function SidebarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="sidebar-separator"
      data-sidebar="separator"
      className={cn("mx-2 w-auto bg-sidebar-border/80", className)}
      {...props}
    />
  );
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={cn(
        "no-scrollbar scrollbar-stable flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-auto overscroll-contain group-data-[collapsible=icon]:overflow-hidden",
        className,
      )}
      {...props}
    />
  );
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
      {...props}
    />
  );
}

function SidebarGroupLabel({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & Readonly<{ asChild?: boolean }>) {
  const Comp = asChild ? Slot.Root : "div";

  return (
    <Comp
      data-slot="sidebar-group-label"
      data-sidebar="group-label"
      className={cn(
        "flex h-8 shrink-0 items-center rounded-xl px-2 text-overline text-sidebar-foreground/65 outline-hidden ring-sidebar-ring transition-[margin,opacity] duration-200 ease-out group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0 focus-visible:ring-2 focus-visible:ring-sidebar-ring/60 [&>svg]:size-4 [&>svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}

function SidebarGroupAction({
  className,
  asChild = false,
  type,
  ...props
}: React.ComponentProps<"button"> & Readonly<{ asChild?: boolean }>) {
  const classNames = cn(
    "absolute top-3.5 right-3 flex aspect-square w-6 items-center justify-center rounded-xl p-0 text-sidebar-foreground outline-hidden ring-sidebar-ring transition-[background-color,color,opacity,transform] duration-200 ease-out group-data-[collapsible=icon]:hidden after:absolute after:-inset-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring/60 active:translate-y-px md:after:hidden [&>svg]:size-4 [&>svg]:shrink-0",
    className,
  );

  if (asChild) {
    return (
      <Slot.Root
        data-slot="sidebar-group-action"
        data-sidebar="group-action"
        className={classNames}
        {...props}
      />
    );
  }

  return (
    <button
      data-slot="sidebar-group-action"
      data-sidebar="group-action"
      type={type ?? "button"}
      className={classNames}
      {...props}
    />
  );
}

function SidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={cn("w-full min-w-0 text-body-sm", className)}
      {...props}
    />
  );
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn("flex w-full min-w-0 flex-col gap-0.5", className)}
      {...props}
    />
  );
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn("group/menu-item relative min-w-0", className)}
      {...props}
    />
  );
}

const sidebarMenuButtonVariants = cva(
  "peer/menu-button group/menu-button flex w-full items-center gap-2 overflow-hidden rounded-xl px-2 text-left text-body-sm text-sidebar-foreground outline-hidden ring-sidebar-ring transition-[width,height,padding,background-color,border-color,color,box-shadow,transform] duration-200 ease-out group-has-data-[sidebar=menu-action]/menu-item:pr-8 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring/60 active:not-aria-[haspopup]:translate-y-px active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-open:hover:bg-sidebar-accent data-open:hover:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-active:[font-weight:var(--typography-emphasis-weight)] [&_svg]:size-4 [&_svg]:shrink-0 [&>span:last-child]:truncate",
  {
    variants: {
      variant: {
        default: "",
        outline:
          "border border-sidebar-border/80 bg-background/70 shadow-xs hover:border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-sm dark:bg-background/20",
      },
      size: {
        default: "h-8",
        sm: "h-7 text-caption",
        lg: "h-11 rounded-2xl text-body-sm group-data-[collapsible=icon]:p-0!",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function SidebarMenuButton({
  asChild = false,
  isActive = false,
  variant = "default",
  size = "default",
  tooltip,
  className,
  type,
  ...props
}: SidebarMenuButtonProps) {
  const { isMobile, state } = useSidebar();
  const resolvedVariant = variant ?? "default";
  const resolvedSize = size ?? "default";
  const classNames = cn(
    sidebarMenuButtonVariants({ variant: resolvedVariant, size: resolvedSize }),
    className,
  );

  const button = asChild ? (
    <Slot.Root
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-size={resolvedSize}
      data-active={isActive ? "true" : undefined}
      className={classNames}
      {...props}
    />
  ) : (
    <button
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-size={resolvedSize}
      data-active={isActive ? "true" : undefined}
      type={type ?? "button"}
      className={classNames}
      {...props}
    />
  );

  if (tooltip === undefined) {
    return button;
  }

  const tooltipProps: React.ComponentProps<typeof TooltipContent> =
    typeof tooltip === "string" ? { children: tooltip } : tooltip;
  const tooltipHidden =
    state !== "collapsed" || isMobile || tooltipProps.hidden === true;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent
        side="right"
        align="center"
        {...tooltipProps}
        hidden={tooltipHidden}
      />
    </Tooltip>
  );
}

function SidebarMenuAction({
  className,
  asChild = false,
  showOnHover = false,
  type,
  ...props
}: React.ComponentProps<"button"> &
  Readonly<{
    asChild?: boolean;
    showOnHover?: boolean;
  }>) {
  const classNames = cn(
    "absolute top-1.5 right-1 flex aspect-square w-6 items-center justify-center rounded-xl p-0 text-sidebar-foreground outline-hidden ring-sidebar-ring transition-[background-color,color,opacity,transform] duration-200 ease-out group-data-[collapsible=icon]:hidden peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[size=default]/menu-button:top-1 peer-data-[size=lg]/menu-button:top-2.5 peer-data-[size=sm]/menu-button:top-0.5 peer-data-active/menu-button:text-sidebar-accent-foreground after:absolute after:-inset-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring/60 active:translate-y-px md:after:hidden [&>svg]:size-4 [&>svg]:shrink-0",
    showOnHover &&
      "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 peer-data-active/menu-button:text-sidebar-accent-foreground aria-expanded:opacity-100 md:opacity-0",
    className,
  );

  if (asChild) {
    return (
      <Slot.Root
        data-slot="sidebar-menu-action"
        data-sidebar="menu-action"
        className={classNames}
        {...props}
      />
    );
  }

  return (
    <button
      data-slot="sidebar-menu-action"
      data-sidebar="menu-action"
      type={type ?? "button"}
      className={classNames}
      {...props}
    />
  );
}

function SidebarMenuBadge({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      className={cn(
        "pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-xl px-1 text-caption text-sidebar-foreground text-tabular [font-weight:var(--typography-emphasis-weight)] select-none group-data-[collapsible=icon]:hidden peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5 peer-data-[size=sm]/menu-button:top-1 peer-data-active/menu-button:text-sidebar-accent-foreground",
        className,
      )}
      {...props}
    />
  );
}

function SidebarMenuSkeleton({
  className,
  showIcon = false,
  "aria-hidden": ariaHidden = true,
  ...props
}: React.ComponentProps<"div"> &
  Readonly<{
    showIcon?: boolean;
  }>) {
  return (
    <div
      data-slot="sidebar-menu-skeleton"
      data-sidebar="menu-skeleton"
      aria-hidden={ariaHidden}
      className={cn("flex h-8 items-center gap-2 rounded-xl px-2", className)}
      {...props}
    >
      {showIcon ? (
        <Skeleton
          className="size-4 rounded-xl"
          data-sidebar="menu-skeleton-icon"
        />
      ) : null}
      <Skeleton
        className="h-4 max-w-(--skeleton-width) flex-1 rounded-xl"
        data-sidebar="menu-skeleton-text"
        style={createSidebarSkeletonTextStyle(SIDEBAR_MENU_SKELETON_WIDTH)}
      />
    </div>
  );
}

function SidebarMenuSub({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      className={cn(
        "mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border/80 px-2.5 py-0.5 group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  );
}

function SidebarMenuSubItem({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-sub-item"
      data-sidebar="menu-sub-item"
      className={cn("group/menu-sub-item relative min-w-0", className)}
      {...props}
    />
  );
}

function SidebarMenuSubButton({
  asChild = false,
  size = "md",
  isActive = false,
  className,
  ...props
}: SidebarMenuSubButtonProps) {
  const Comp = asChild ? Slot.Root : "a";

  return (
    <Comp
      data-slot="sidebar-menu-sub-button"
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive ? "true" : undefined}
      className={cn(
        "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-xl px-2 text-sidebar-foreground outline-hidden ring-sidebar-ring transition-[background-color,color,box-shadow,transform] duration-200 ease-out group-data-[collapsible=icon]:hidden hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring/60 active:translate-y-px active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[size=md]:text-body-sm data-[size=sm]:text-caption data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-active:[font-weight:var(--typography-emphasis-weight)] [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
        className,
      )}
      {...props}
    />
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
};
