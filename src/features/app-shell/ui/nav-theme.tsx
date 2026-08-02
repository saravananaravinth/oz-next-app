// oz-next-app/src/features/app-shell/ui/nav-theme.tsx
"use client";

import { Moon, Monitor, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ThemeMenuProps = Readonly<{
  align?: "start" | "center" | "end";
}>;

type ThemeMode = "light" | "dark" | "system";

function isThemeMode(value: string): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function resolveThemeMode(value: string | undefined): ThemeMode {
  return value !== undefined && isThemeMode(value) ? value : "system";
}

export function ThemeMenu({ align = "end" }: ThemeMenuProps) {
  const { setTheme, theme } = useTheme();

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
            className="size-4 rotate-0 scale-100 transition-transform duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)] motion-reduce:transition-none dark:-rotate-90 dark:scale-0"
          />
          <Moon
            aria-hidden="true"
            className="absolute size-4 rotate-90 scale-0 transition-transform duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)] motion-reduce:transition-none dark:rotate-0 dark:scale-100"
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align={align} className="min-w-44">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={resolveThemeMode(theme)}
          onValueChange={(value) => {
            if (isThemeMode(value)) {
              setTheme(value);
            }
          }}
        >
          <DropdownMenuRadioItem value="light">
            <Sun aria-hidden="true" />
            Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon aria-hidden="true" />
            Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor aria-hidden="true" />
            System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
