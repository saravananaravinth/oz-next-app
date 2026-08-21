// oz-next-app/src/components/common/feedback/unsupported-browser.tsx
import Link from "next/link";
import {
  ExternalLink,
  MonitorSmartphone,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  SUPPORTED_BROWSER_MINIMUMS,
  type BrowserVersion,
} from "@/lib/runtime/browser-support";

function formatBrowserVersion(version: BrowserVersion): string {
  if (version.minor === 0) {
    return String(version.major);
  }

  return `${String(version.major)}.${String(version.minor)}`;
}

const BROWSER_LINKS = [
  {
    label: `Google Chrome ${formatBrowserVersion(
      SUPPORTED_BROWSER_MINIMUMS.chrome,
    )}+`,
    href: "https://www.google.com/chrome/",
  },
  {
    label: `Microsoft Edge ${formatBrowserVersion(
      SUPPORTED_BROWSER_MINIMUMS.edge,
    )}+`,
    href: "https://www.microsoft.com/edge/download",
  },
  {
    label: `Mozilla Firefox ${formatBrowserVersion(
      SUPPORTED_BROWSER_MINIMUMS.firefox,
    )}+`,
    href: "https://www.mozilla.org/firefox/new/",
  },
  {
    label: `Safari ${formatBrowserVersion(SUPPORTED_BROWSER_MINIMUMS.safari)}+`,
    href: "https://support.apple.com/102665",
  },
] as const;

export function UnsupportedBrowser(): ReactElement {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-dvh w-full items-center justify-center bg-muted/30 px-4 py-8 text-foreground outline-none sm:px-6 lg:px-8"
    >
      <section
        aria-labelledby="unsupported-browser-title"
        aria-describedby="unsupported-browser-description"
        className="w-full max-w-2xl"
      >
        <Card className="overflow-hidden border-warning/30 shadow-sm shadow-foreground/5">
          <CardHeader className="gap-5 px-6 pt-8 sm:px-8 sm:pt-10">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-warning/30 bg-warning/10 text-warning-foreground dark:text-warning">
              <ShieldAlert aria-hidden="true" className="size-7" />
            </div>

            <div className="grid gap-3">
              <CardTitle>
                <h1 id="unsupported-browser-title" className="text-page-title">
                  Update your browser to use Ozotec ERP
                </h1>
              </CardTitle>

              <CardDescription
                id="unsupported-browser-description"
                className="max-w-prose text-body text-muted-readable"
              >
                This browser is older than the versions supported by the ERP.
                Updating protects sign-in, forms, uploads, tables, and other
                operational workflows from compatibility failures.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="grid gap-6 px-6 sm:px-8">
            <div className="rounded-2xl border border-border/70 bg-muted/35 p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2 text-body-sm font-medium text-foreground">
                <MonitorSmartphone aria-hidden="true" className="size-4" />
                Supported browser versions
              </div>

              <ul className="grid gap-2 text-body-sm text-muted-readable sm:grid-cols-2">
                {BROWSER_LINKS.map((browser) => (
                  <li key={browser.href}>
                    <a
                      href={browser.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md underline underline-offset-4 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      {browser.label}
                      <ExternalLink aria-hidden="true" className="size-3.5" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            <div className="grid gap-2 text-body-sm text-muted-readable">
              <p>
                After updating, close and reopen the browser before trying the
                ERP again.
              </p>
              <p>
                Browser extensions or managed enterprise policies can also
                disable required web capabilities. If the warning remains on a
                current browser, contact your IT administrator.
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex-col items-stretch gap-3 px-6 pb-8 sm:flex-row sm:items-center sm:px-8 sm:pb-10">
            <Button asChild>
              <Link href="/">
                <RefreshCw
                  aria-hidden="true"
                  data-icon="inline-start"
                  className="size-4"
                />
                Re-check browser
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </section>
    </main>
  );
}

export default UnsupportedBrowser;
