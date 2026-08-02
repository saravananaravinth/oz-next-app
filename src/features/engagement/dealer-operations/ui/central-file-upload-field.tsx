"use client";

import * as React from "react";
import {
  CheckCircle2,
  FileUp,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import type { DealerFileStatus } from "@/features/engagement/dealer-operations/contracts/dealer-operations.schema";
import {
  DealerUploadError,
  resumeDealerFileScan,
  uploadDealerFile,
  type DealerUploadProgress,
  type DealerUploadTarget,
} from "@/features/engagement/dealer-operations/utils/dealer-upload.client";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export type CentralFileUploadFieldProps = Readonly<{
  id: string;
  name: string;
  label: string;
  description: string;
  target: DealerUploadTarget;
  accept: string;
  disabled?: boolean;
  required?: boolean;
  onReady?: (file: DealerFileStatus) => void;
  onReadyChange?: (file: DealerFileStatus | null) => void;
}>;

type UploadState =
  | Readonly<{ kind: "idle" }>
  | Readonly<{ kind: "working"; progress: DealerUploadProgress }>
  | Readonly<{ kind: "pending"; file: DealerFileStatus; message: string }>
  | Readonly<{ kind: "ready"; file: DealerFileStatus }>
  | Readonly<{ kind: "error"; message: string }>;

export function CentralFileUploadField({
  id,
  name,
  label,
  description,
  target,
  accept,
  disabled = false,
  required = false,
  onReady,
  onReadyChange,
}: CentralFileUploadFieldProps): React.ReactElement {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [state, setState] = React.useState<UploadState>({ kind: "idle" });

  const markReady = React.useCallback(
    (file: DealerFileStatus): void => {
      setState({ kind: "ready", file });
      onReady?.(file);
      onReadyChange?.(file);
    },
    [onReady, onReadyChange],
  );

  const handleUploadError = React.useCallback((error: unknown): void => {
    if (
      error instanceof DealerUploadError &&
      error.code === "file_scan_pending" &&
      error.fileStatus !== null
    ) {
      setState({
        kind: "pending",
        file: error.fileStatus,
        message: error.message,
      });
      return;
    }

    setState({
      kind: "error",
      message:
        error instanceof DealerUploadError || error instanceof Error
          ? error.message
          : "The file upload failed.",
    });
  }, []);

  const handleSelection = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = event.currentTarget.files?.[0];

      if (file === undefined) {
        return;
      }

      if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
        setState({
          kind: "error",
          message: "Choose a non-empty file no larger than 25 MB.",
        });
        return;
      }

      try {
        onReadyChange?.(null);
        const ready = await uploadDealerFile(file, target, (progress) => {
          setState({ kind: "working", progress });
        });
        markReady(ready);
      } catch (error: unknown) {
        handleUploadError(error);
      }
    },
    [handleUploadError, markReady, onReadyChange, target],
  );

  async function retryScan(file: DealerFileStatus): Promise<void> {
    try {
      const ready = await resumeDealerFileScan(file, (progress) => {
        setState({ kind: "working", progress });
      });
      markReady(ready);
    } catch (error: unknown) {
      handleUploadError(error);
    }
  }

  function reset(): void {
    if (inputRef.current !== null) {
      inputRef.current.value = "";
    }

    setState({ kind: "idle" });
    onReadyChange?.(null);
  }

  const fileId = state.kind === "ready" ? state.file.fileId : "";
  const working = state.kind === "working";
  const progressValue =
    state.kind !== "working"
      ? 0
      : state.progress.phase === "hashing"
        ? 18
        : state.progress.phase === "uploading"
          ? 55
          : state.progress.phase === "scanning"
            ? 82
            : 100;

  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor={id}>
          {label}
          {required ? <span aria-hidden="true"> *</span> : null}
        </Label>
        <p className="text-caption text-muted-readable">{description}</p>
      </div>

      <input type="hidden" name={name} value={fileId} />

      {state.kind === "ready" ? (
        <Alert>
          <CheckCircle2 aria-hidden="true" />
          <AlertTitle>Verified file ready</AlertTitle>
          <AlertDescription className="grid gap-2">
            <span>
              {state.file.fileName} passed the centralized security scan and can
              now be attached.
            </span>
            <Button type="button" variant="outline" size="sm" onClick={reset}>
              <RotateCcw aria-hidden="true" className="size-4" />
              Replace file
            </Button>
          </AlertDescription>
        </Alert>
      ) : state.kind === "pending" ? (
        <Alert variant="warning">
          <ShieldCheck aria-hidden="true" />
          <AlertTitle>Security scan is still processing</AlertTitle>
          <AlertDescription className="grid gap-2">
            <span>{state.message}</span>
            <span>
              The uploaded object is preserved as {state.file.fileName}; no
              duplicate upload is required.
            </span>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void retryScan(state.file);
                }}
              >
                <RefreshCw aria-hidden="true" className="size-4" />
                Check scan status
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={reset}>
                Choose another file
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-3 rounded-2xl border border-dashed border-border/80 bg-muted/20 p-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-background text-muted-readable shadow-xs">
              {working ? (
                <Spinner aria-hidden="true" className="size-5" />
              ) : (
                <FileUp aria-hidden="true" className="size-5" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <Input
                ref={inputRef}
                id={id}
                type="file"
                placeholder="Choose a document to upload"
                accept={accept}
                disabled={disabled || working}
                onChange={(event) => {
                  void handleSelection(event);
                }}
                aria-describedby={`${id}-security-note`}
              />
              <p
                id={`${id}-security-note`}
                className="mt-2 flex items-center gap-2 text-caption text-muted-readable"
              >
                <ShieldCheck aria-hidden="true" className="size-4" />
                Private, checksum-bound upload with mandatory malware scanning.
              </p>
            </div>
          </div>

          {working ? (
            <div className="grid gap-2" aria-live="polite">
              <p className="text-body-sm">{state.progress.message}</p>
              <Progress
                value={progressValue}
                aria-label="File upload progress"
              />
            </div>
          ) : null}
        </div>
      )}

      {state.kind === "error" ? (
        <Alert variant="destructive">
          <TriangleAlert aria-hidden="true" />
          <AlertTitle>File could not be prepared</AlertTitle>
          <AlertDescription className="grid gap-2">
            <span>{state.message}</span>
            <Button type="button" variant="outline" size="sm" onClick={reset}>
              Try another file
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
