// oz-next-app/src/components/app-shell/nav-user.tsx
"use client";

import * as React from "react";
import { LogOut, ShieldCheck, UserRound } from "lucide-react";

import type { AuthInfo } from "@/components/app-shell/app-sidebar";
import {
  cleanDisplayText,
  formatRoleLabel,
} from "@/components/common/display-label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { safeImageSrc } from "@/lib/security";

export type UserSummary = AuthInfo;

export type NavUserProps = Readonly<{
  user: UserSummary;
  onSignOut?: (() => void | Promise<void>) | undefined;
  signOutPending?: boolean | undefined;
  signOutDisabled?: boolean | undefined;
}>;

const MAX_DISPLAY_TEXT_LENGTH = 120;

function initials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/u)
    .filter((part) => part.length > 0)
    .slice(0, 2);

  return (
    parts.map((part) => part[0]?.toLocaleUpperCase("en-US") ?? "").join("") ||
    "U"
  );
}

export function NavUser({
  user,
  onSignOut,
  signOutPending = false,
  signOutDisabled = false,
}: NavUserProps): React.ReactElement {
  const [isPending, startTransition] = React.useTransition();
  const name = cleanDisplayText(user.name, "ERP User", MAX_DISPLAY_TEXT_LENGTH);
  const role = formatRoleLabel(
    user.activeRole ?? user.primaryRole,
    "Workspace user",
    MAX_DISPLAY_TEXT_LENGTH,
  );
  const avatarSrc = safeImageSrc(user.avatar);
  const roleCount = Math.max(0, user.roles.length);
  const resolvedPending = signOutPending || isPending;
  const canSignOut =
    onSignOut !== undefined && !signOutDisabled && !resolvedPending;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip={name}
              className="rounded-2xl px-2.5 hover:bg-sidebar-accent/80 data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
            >
              <Avatar size="sm" className="ring-2 ring-sidebar-border/70">
                <AvatarImage src={avatarSrc} alt="" />
                <AvatarFallback>{initials(name)}</AvatarFallback>
              </Avatar>

              <span className="grid min-w-0 flex-1 gap-0.5 text-left group-data-[collapsible=icon]:hidden">
                <span className="truncate text-body-sm text-sidebar-foreground">
                  {name}
                </span>
                <span className="truncate text-caption text-sidebar-foreground/65">
                  {role}
                </span>
              </span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="top"
            align="end"
            className="w-72 rounded-3xl border-border/70 p-2 shadow-xl shadow-foreground/5"
          >
            <DropdownMenuLabel className="grid gap-2 rounded-2xl px-3 py-3">
              <span className="truncate text-body-sm text-foreground">
                {name}
              </span>
              <span className="inline-flex w-fit max-w-full rounded-full border border-border/70 bg-muted/50 px-2 py-0.5 text-caption text-muted-readable">
                <span className="truncate">{role}</span>
              </span>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem disabled className="gap-2.5 rounded-2xl">
              <ShieldCheck aria-hidden="true" className="text-success" />
              <span className="truncate">Server-authenticated session</span>
            </DropdownMenuItem>

            <DropdownMenuItem disabled className="gap-2.5 rounded-2xl">
              <UserRound aria-hidden="true" />
              <span>
                {roleCount} role{roleCount === 1 ? "" : "s"}
              </span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              variant="destructive"
              className="gap-2.5 rounded-2xl"
              onSelect={(event) => {
                event.preventDefault();

                if (!canSignOut) {
                  return;
                }

                startTransition(() => {
                  void onSignOut();
                });
              }}
              disabled={!canSignOut}
            >
              <LogOut aria-hidden="true" />
              {resolvedPending ? "Signing out…" : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
