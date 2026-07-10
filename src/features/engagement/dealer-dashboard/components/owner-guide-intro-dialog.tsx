"use client";

import {
  BadgeCheck,
  BookOpen,
  ContactRound,
  Route,
  TrendingUp,
  UserRoundCheck,
} from "lucide-react";
import * as React from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { UI_STORAGE_KEYS } from "@/lib/ui-preferences";

type GuideStep = Readonly<{
  title: string;
  description: string;
  icon: React.ReactNode;
}>;

const DASHBOARD_PATH = "/dashboard";
const ACKNOWLEDGED_VALUE = "1";

const GUIDE_STEPS: readonly GuideStep[] = [
  {
    title: "Capture",
    description: "Receive a dealer lead with verified, usable contact data.",
    icon: <ContactRound aria-hidden="true" className="size-5" />,
  },
  {
    title: "Match",
    description:
      "Use active, assignment-enabled guides with fresh locations and available capacity.",
    icon: <Route aria-hidden="true" className="size-5" />,
  },
  {
    title: "Engage",
    description: "The guide accepts, visits, and completes the test drive.",
    icon: <UserRoundCheck aria-hidden="true" className="size-5" />,
  },
  {
    title: "Convert",
    description: "Track booking and conversion outcomes for the dealer.",
    icon: <TrendingUp aria-hidden="true" className="size-5" />,
  },
];

let autoOpenEvaluatedInDocument = false;
let lastDashboardUnmountDestination: string | null = null;

function readAcknowledgedPreference(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return (
      window.localStorage.getItem(
        UI_STORAGE_KEYS.DEALER_DASHBOARD_GUIDE_ACKNOWLEDGED,
      ) === ACKNOWLEDGED_VALUE
    );
  } catch {
    return false;
  }
}

function writeAcknowledgedPreference(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.setItem(
      UI_STORAGE_KEYS.DEALER_DASHBOARD_GUIDE_ACKNOWLEDGED,
      ACKNOWLEDGED_VALUE,
    );
    return true;
  } catch {
    return false;
  }
}

function isReloadOfCurrentDashboard(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const navigationEntry = window.performance
    .getEntriesByType("navigation")
    .at(0) as PerformanceNavigationTiming | undefined;

  if (navigationEntry?.type !== "reload") {
    return false;
  }

  try {
    return new URL(navigationEntry.name).pathname === window.location.pathname;
  } catch {
    return window.location.pathname === DASHBOARD_PATH;
  }
}

function shouldOpenAutomatically(): boolean {
  if (readAcknowledgedPreference()) {
    return false;
  }

  const isFirstDashboardEvaluation = !autoOpenEvaluatedInDocument;
  const returnedFromAnotherPage =
    autoOpenEvaluatedInDocument &&
    lastDashboardUnmountDestination !== null &&
    lastDashboardUnmountDestination !== DASHBOARD_PATH;

  autoOpenEvaluatedInDocument = true;
  lastDashboardUnmountDestination = null;

  return (
    returnedFromAnotherPage ||
    (isFirstDashboardEvaluation && !isReloadOfCurrentDashboard())
  );
}

export function OwnerGuideIntroDialog(): React.ReactElement {
  const [introOpen, setIntroOpen] = React.useState(false);
  const [confirmationOpen, setConfirmationOpen] = React.useState(false);
  const toast = useToast();

  React.useEffect(() => {
    const autoOpenFrameId = window.requestAnimationFrame(() => {
      if (shouldOpenAutomatically()) {
        setIntroOpen(true);
      }
    });

    const handlePageShow = (event: PageTransitionEvent): void => {
      if (event.persisted && !readAcknowledgedPreference()) {
        setIntroOpen(true);
      }
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.cancelAnimationFrame(autoOpenFrameId);
      window.removeEventListener("pageshow", handlePageShow);

      window.setTimeout(() => {
        lastDashboardUnmountDestination = window.location.pathname;
      }, 0);
    };
  }, []);

  const skipForNow = React.useCallback((): void => {
    setIntroOpen(false);
  }, []);

  const requestPermanentDismissal = React.useCallback((): void => {
    setIntroOpen(false);
    setConfirmationOpen(true);
  }, []);

  const confirmPermanentDismissal = React.useCallback((): void => {
    const saved = writeAcknowledgedPreference();

    setConfirmationOpen(false);

    if (!saved) {
      toast.error({
        title: "Guide preference could not be saved",
        description:
          "The guide is closed for now, but it may appear again on a future visit in this browser.",
      });
    }
  }, [toast]);

  const keepShowingGuide = React.useCallback((): void => {
    setConfirmationOpen(false);
    setIntroOpen(true);
  }, []);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full sm:w-auto"
        onClick={() => {
          setIntroOpen(true);
        }}
      >
        <BookOpen aria-hidden="true" className="size-4" />
        View guide
      </Button>

      <Dialog
        open={introOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            skipForNow();
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className={[
            "max-h-[min(92dvh,46rem)] overflow-hidden sm:max-w-3xl",
            "grid-rows-[auto_minmax(0,1fr)_auto]",
          ].join(" ")}
        >
          <DialogHeader>
            <div
              className={[
                "mb-1 flex size-12 items-center justify-center rounded-2xl",
                "border border-primary/20 bg-primary/10 text-primary",
              ].join(" ")}
            >
              <BadgeCheck aria-hidden="true" className="size-6" />
            </div>
            <DialogTitle>How the Owner Guide flow works</DialogTitle>
            <DialogDescription>
              Follow this four-step operating path from a verified dealer lead
              to a measurable booking or conversion.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-full min-h-0">
            <ol className="grid gap-3 pr-4 md:grid-cols-2">
              {GUIDE_STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className={[
                    "grid min-w-0 gap-3 rounded-2xl p-4 sm:p-5",
                    "border border-border/70 bg-muted/25",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={[
                        "flex size-10 shrink-0 items-center justify-center rounded-2xl",
                        "border border-primary/20 bg-primary/10 text-primary",
                      ].join(" ")}
                    >
                      {step.icon}
                    </span>
                    <span className="text-caption text-muted-readable text-tabular">
                      Step {String(index + 1)}
                    </span>
                  </div>
                  <div className="grid gap-1.5">
                    <h3 className="text-card-title text-foreground">
                      {step.title}
                    </h3>
                    <p className="text-body-sm text-muted-readable text-pretty">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </ScrollArea>

          <DialogFooter className="gap-3 sm:items-center sm:justify-between">
            <p className="text-caption text-muted-readable text-pretty sm:max-w-md">
              Skip closes the guide for this dashboard visit. Refreshing the
              page will not reopen it.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="ghost" onClick={skipForNow}>
                Skip for now
              </Button>
              <Button type="button" onClick={requestPermanentDismissal}>
                I understand
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Stop showing this guide?</AlertDialogTitle>
            <AlertDialogDescription>
              This saves a non-sensitive preference in this browser. The guide
              will no longer open automatically, but you can reopen it anytime
              with “View guide”.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={keepShowingGuide}>
              Keep showing
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmPermanentDismissal}>
              Don&apos;t show again
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
