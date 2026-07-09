// oz-next-app/src/components/app-shell/notifications.tsx
"use client";

import * as React from "react";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type NotificationItem = Readonly<{
  id: string;
  title: string;
  description?: string | null;
  unread?: boolean;
}>;

export type NotificationsSheetProps = Readonly<{
  initialNotifications?: readonly NotificationItem[];
}>;

const MAX_ITEMS = 20;
const MAX_TEXT_LENGTH = 180;

const ASCII_CONTROL_MAX_CODE_POINT = 0x1f;
const ASCII_DELETE_CODE_POINT = 0x7f;
const WHITESPACE_RE = /\s+/gu;

function replaceControlCharacters(value: string): string {
  let output = "";
  let changed = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index] ?? "";
    const codePoint = value.charCodeAt(index);

    if (
      codePoint <= ASCII_CONTROL_MAX_CODE_POINT ||
      codePoint === ASCII_DELETE_CODE_POINT
    ) {
      output += " ";
      changed = true;
      continue;
    }

    output += character;
  }

  return changed ? output : value;
}

function cleanText(value: string | null | undefined, fallback = ""): string {
  const normalized = replaceControlCharacters(value ?? "")
    .replace(WHITESPACE_RE, " ")
    .trim();
  const resolved = normalized.length > 0 ? normalized : fallback;

  return resolved.length <= MAX_TEXT_LENGTH
    ? resolved
    : `${resolved.slice(0, MAX_TEXT_LENGTH - 1).trimEnd()}…`;
}

function normalizeNotifications(
  notifications: readonly NotificationItem[],
): readonly NotificationItem[] {
  const output: NotificationItem[] = [];
  const seen = new Set<string>();

  for (const notification of notifications.slice(0, MAX_ITEMS)) {
    const id = cleanText(notification.id);

    if (id.length === 0 || seen.has(id)) {
      continue;
    }

    const description =
      notification.description === undefined ||
      notification.description === null
        ? null
        : cleanText(notification.description);

    seen.add(id);
    output.push({
      id,
      title: cleanText(notification.title, "Notification"),
      ...(description !== null && description.length > 0
        ? { description }
        : {}),
      unread: notification.unread === true,
    });
  }

  return output;
}

export function NotificationsSheet({
  initialNotifications = [],
}: NotificationsSheetProps): React.ReactElement {
  const notifications = React.useMemo(
    () => normalizeNotifications(initialNotifications),
    [initialNotifications],
  );
  const unreadCount = notifications.filter(
    (notification) => notification.unread === true,
  ).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Open notifications"
        >
          <span className="relative">
            <Bell aria-hidden="true" className="size-4" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 size-2 rounded-full bg-primary" />
            ) : null}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>

        {notifications.length === 0 ? (
          <div className="px-3 py-6 text-center text-body-sm text-muted-readable">
            No notifications.
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className="items-start gap-3"
            >
              <span
                className="mt-1 size-2 rounded-full bg-primary opacity-0 data-[unread=true]:opacity-100"
                data-unread={notification.unread === true}
              />
              <span className="grid min-w-0 gap-0.5">
                <span className="truncate text-body-sm">
                  {notification.title}
                </span>
                {notification.description !== null &&
                notification.description !== undefined ? (
                  <span className="line-clamp-2 text-caption text-muted-readable">
                    {notification.description}
                  </span>
                ) : null}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
