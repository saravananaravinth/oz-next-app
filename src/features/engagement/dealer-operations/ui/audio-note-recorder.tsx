"use client";

import * as React from "react";
import {
  CircleStop,
  Mic,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
  Upload,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import type { DealerFileStatus } from "@/features/engagement/dealer-operations/contracts/dealer-operations.schema";
import {
  DealerUploadError,
  resumeDealerFileScan,
  uploadDealerFile,
  type DealerUploadProgress,
} from "@/features/engagement/dealer-operations/utils/dealer-upload.client";

const MAX_RECORDING_SECONDS = 15 * 60;
const TIMER_INTERVAL_MS = 250;
const AUDIO_MIME_CANDIDATES = ["audio/webm", "audio/mp4", "audio/ogg"] as const;

type RecorderState =
  | "idle"
  | "recording"
  | "recorded"
  | "uploading"
  | "pending"
  | "ready"
  | "error";

export type AudioNoteRecorderProps = Readonly<{
  applicationId: string;
  inputName?: string;
  onReadyChange?: (file: DealerFileStatus | null) => void;
}>;

export function AudioNoteRecorder({
  applicationId,
  inputName = "audioFileId",
  onReadyChange,
}: AudioNoteRecorderProps): React.ReactElement {
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const startedAtRef = React.useRef<number | null>(null);
  const stopTimerRef = React.useRef<number | null>(null);
  const [state, setState] = React.useState<RecorderState>("idle");
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const [recording, setRecording] = React.useState<Blob | null>(null);
  const [recordingUrl, setRecordingUrl] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<DealerUploadProgress | null>(
    null,
  );
  const [readyFile, setReadyFile] = React.useState<DealerFileStatus | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const supportedMimeType = React.useMemo(resolveSupportedMimeType, []);

  React.useEffect(() => {
    return () => {
      cleanupStream(streamRef.current);
      if (recordingUrl !== null) URL.revokeObjectURL(recordingUrl);
      if (stopTimerRef.current !== null)
        window.clearInterval(stopTimerRef.current);
    };
  }, [recordingUrl]);

  const stopRecording = React.useCallback((): void => {
    const recorder = mediaRecorderRef.current;
    if (recorder !== null && recorder.state !== "inactive") recorder.stop();
  }, []);

  async function startRecording(): Promise<void> {
    if (supportedMimeType === null) {
      setState("error");
      setErrorMessage(
        "Audio recording is not supported by this browser. Upload a supported audio file instead.",
      );
      return;
    }
    try {
      resetRecording();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, {
        mimeType: supportedMimeType,
      });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      });
      recorder.addEventListener("stop", () => {
        const blob = new Blob(chunksRef.current, { type: supportedMimeType });
        cleanupStream(streamRef.current);
        streamRef.current = null;
        mediaRecorderRef.current = null;
        if (stopTimerRef.current !== null) {
          window.clearInterval(stopTimerRef.current);
          stopTimerRef.current = null;
        }
        if (blob.size <= 0) {
          setState("error");
          setErrorMessage("The recording was empty. Record the note again.");
          return;
        }
        const url = URL.createObjectURL(blob);
        setRecording(blob);
        setRecordingUrl(url);
        setState("recorded");
      });
      recorder.start(1_000);
      startedAtRef.current = Date.now();
      setElapsedSeconds(0);
      setState("recording");
      stopTimerRef.current = window.setInterval(() => {
        const startedAt = startedAtRef.current;
        if (startedAt === null) return;
        const elapsed = Math.floor((Date.now() - startedAt) / 1_000);
        setElapsedSeconds(elapsed);
        if (elapsed >= MAX_RECORDING_SECONDS) stopRecording();
      }, TIMER_INTERVAL_MS);
    } catch (error: unknown) {
      cleanupStream(streamRef.current);
      streamRef.current = null;
      setState("error");
      setErrorMessage(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Microphone permission was denied. Allow microphone access or upload an audio file."
          : "The microphone could not be started.",
      );
    }
  }

  async function uploadRecording(): Promise<void> {
    if (recording === null || supportedMimeType === null) return;
    try {
      setState("uploading");
      setErrorMessage(null);
      const extension = extensionForMime(supportedMimeType);
      const file = new File(
        [recording],
        `dealership-audio-note-${new Date().toISOString().replace(/[:.]/gu, "-")}.${extension}`,
        { type: supportedMimeType, lastModified: Date.now() },
      );
      const status = await uploadDealerFile(
        file,
        {
          resourceKind: "APPLICATION",
          resourceId: applicationId,
          purpose: "AUDIO_NOTE",
        },
        setProgress,
      );
      setReadyFile(status);
      onReadyChange?.(status);
      setState("ready");
    } catch (error: unknown) {
      if (
        error instanceof DealerUploadError &&
        error.code === "file_scan_pending" &&
        error.fileStatus !== null
      ) {
        setReadyFile(error.fileStatus);
        onReadyChange?.(null);
        setState("pending");
        setErrorMessage(error.message);
        return;
      }

      setState("error");
      setErrorMessage(
        error instanceof DealerUploadError || error instanceof Error
          ? error.message
          : "The audio note upload failed.",
      );
    }
  }

  async function retryScan(): Promise<void> {
    if (readyFile === null) return;

    try {
      setState("uploading");
      setErrorMessage(null);
      const status = await resumeDealerFileScan(readyFile, setProgress);
      setReadyFile(status);
      onReadyChange?.(status);
      setState("ready");
    } catch (error: unknown) {
      if (
        error instanceof DealerUploadError &&
        error.code === "file_scan_pending" &&
        error.fileStatus !== null
      ) {
        setReadyFile(error.fileStatus);
        onReadyChange?.(null);
        setState("pending");
        setErrorMessage(error.message);
        return;
      }

      setState("error");
      setErrorMessage(
        error instanceof DealerUploadError || error instanceof Error
          ? error.message
          : "The audio-note scan status could not be checked.",
      );
    }
  }

  function resetRecording(): void {
    stopRecording();
    cleanupStream(streamRef.current);
    streamRef.current = null;
    if (recordingUrl !== null) URL.revokeObjectURL(recordingUrl);
    setRecording(null);
    setRecordingUrl(null);
    setReadyFile(null);
    onReadyChange?.(null);
    setProgress(null);
    setElapsedSeconds(0);
    setErrorMessage(null);
    setState("idle");
  }

  const progressValue =
    progress?.phase === "hashing"
      ? 20
      : progress?.phase === "uploading"
        ? 55
        : progress?.phase === "scanning"
          ? 85
          : progress?.phase === "ready"
            ? 100
            : 0;

  return (
    <div className="grid gap-3 rounded-2xl border border-border/70 p-4">
      <input type="hidden" name={inputName} value={readyFile?.fileId ?? ""} />
      <div className="grid gap-1">
        <Label>Audio note</Label>
        <p className="text-caption text-muted-readable">
          Record up to 15 minutes, review it locally, then confirm the secure
          upload. Nothing is uploaded while recording.
        </p>
      </div>

      {supportedMimeType === null ? (
        <Alert variant="warning">
          <TriangleAlert aria-hidden="true" />
          <AlertTitle>Recording is unavailable</AlertTitle>
          <AlertDescription>
            This browser does not expose a supported MediaRecorder audio format.
          </AlertDescription>
        </Alert>
      ) : null}

      {state === "recording" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-destructive/5 p-3">
          <div className="flex items-center gap-2">
            <span className="size-2 animate-pulse rounded-full bg-destructive motion-reduce:animate-none" />
            <span className="font-medium">
              Recording {formatDuration(elapsedSeconds)}
            </span>
          </div>
          <Button type="button" variant="destructive" onClick={stopRecording}>
            <CircleStop aria-hidden="true" className="size-4" />
            Stop recording
          </Button>
        </div>
      ) : null}

      {state === "idle" ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => void startRecording()}
          disabled={supportedMimeType === null}
        >
          <Mic aria-hidden="true" className="size-4" />
          Start audio note
        </Button>
      ) : null}

      {recordingUrl !== null && (state === "recorded" || state === "error") ? (
        <div className="grid gap-3">
          <audio
            controls
            preload="metadata"
            src={recordingUrl}
            className="w-full"
            aria-label="Recorded audio note preview"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void uploadRecording()}>
              <Upload aria-hidden="true" className="size-4" />
              Confirm and upload
            </Button>
            <Button type="button" variant="outline" onClick={resetRecording}>
              <RotateCcw aria-hidden="true" className="size-4" />
              Record again
            </Button>
          </div>
        </div>
      ) : null}

      {state === "uploading" ? (
        <div className="grid gap-2" aria-live="polite">
          <div className="flex items-center gap-2 text-body-sm">
            <Spinner aria-hidden="true" className="size-4" />
            {progress?.message ?? "Preparing audio note…"}
          </div>
          <Progress value={progressValue} aria-label="Audio upload progress" />
        </div>
      ) : null}

      {state === "pending" && readyFile !== null ? (
        <Alert variant="warning">
          <ShieldCheck aria-hidden="true" />
          <AlertTitle>Audio security scan is still processing</AlertTitle>
          <AlertDescription className="grid gap-2">
            <span>
              {errorMessage ??
                "The recording is uploaded and waiting for the centralized scanner."}
            </span>
            <span>No duplicate recording or upload is required.</span>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void retryScan();
                }}
              >
                <RefreshCw aria-hidden="true" className="size-4" />
                Check scan status
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetRecording}
              >
                Record again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {state === "ready" && readyFile !== null ? (
        <Alert>
          <ShieldCheck aria-hidden="true" />
          <AlertTitle>Audio note verified</AlertTitle>
          <AlertDescription className="grid gap-2">
            <span>
              The recording passed the centralized file scan and will be
              attached when this activity is saved.
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetRecording}
            >
              Replace recording
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {state === "error" && errorMessage !== null ? (
        <Alert variant="destructive">
          <TriangleAlert aria-hidden="true" />
          <AlertTitle>Audio note could not be prepared</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex items-center gap-2 text-caption text-muted-readable">
        <Play aria-hidden="true" className="size-4" />
        Preview before upload; uploaded audio remains private and actor scoped.
      </div>
    </div>
  );
}

function resolveSupportedMimeType():
  (typeof AUDIO_MIME_CANDIDATES)[number] | null {
  if (typeof MediaRecorder === "undefined") return null;
  return (
    AUDIO_MIME_CANDIDATES.find((mimeType) =>
      MediaRecorder.isTypeSupported(mimeType),
    ) ?? null
  );
}

function extensionForMime(
  mimeType: (typeof AUDIO_MIME_CANDIDATES)[number],
): string {
  if (mimeType === "audio/mp4") return "m4a";
  if (mimeType === "audio/ogg") return "ogg";
  return "webm";
}

function cleanupStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => {
    track.stop();
  });
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}
