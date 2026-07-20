// oz-next-app/src/features/app-shell/ui/nav-theme.tsx
"use client";

import { Moon, Monitor, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ThemeMenuProps = Readonly<{
  align?: "start" | "center" | "end";
}>;

export function ThemeMenu({ align = "end" }: ThemeMenuProps) {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Change appearance"
        >
          <Sun
            aria-hidden="true"
            className="size-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0"
          />
          <Moon
            aria-hidden="true"
            className="absolute size-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100"
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align={align}>
        <DropdownMenuItem
          onSelect={() => {
            setTheme("light");
          }}
        >
          <Sun aria-hidden="true" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            setTheme("dark");
          }}
        >
          <Moon aria-hidden="true" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            setTheme("system");
          }}
        >
          <Monitor aria-hidden="true" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
