// oz-next-app/src/features/extended-warranty/api/live-installation-recorder.ts
import { EXTENDED_WARRANTY_INSTALLATION_VIDEO_MAX_BYTES } from "../contracts/order-status.schema";
import type { LiveRecording } from "./installation-upload-session";

export type InstallationRecorderHandle = Readonly<{
  stop: () => void;
  cancel: () => void;
}>;

/** Owns recorder events and timers. Cancellation/error can never submit partial media. */
export function startInstallationRecorder(
  stream: MediaStream,
  mimeType: string,
  callbacks: Readonly<{
    complete: (recording: LiveRecording) => void;
    error: () => void;
    tick: (elapsedMs: number) => void;
  }>,
  createRecorder = (
    media: MediaStream,
    options: MediaRecorderOptions,
  ): MediaRecorder => new MediaRecorder(media, options),
): InstallationRecorderHandle {
  const stopTracks = (): void => {
    for (const track of stream.getTracks()) track.stop();
  };
  let recorder: MediaRecorder;
  try {
    recorder = createRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 1_500_000,
      audioBitsPerSecond: 96_000,
    });
  } catch (error) {
    stopTracks();
    throw error;
  }
  let cancelled = false;
  let finished = false;
  let chunks: Blob[] = [];
  let totalBytes = 0;
  const startedAt = Date.now();
  const timers: {
    stop: ReturnType<typeof setTimeout> | undefined;
    tick: ReturnType<typeof setInterval> | undefined;
  } = {
    stop: undefined,
    tick: undefined,
  };
  const clearTimers = (): void => {
    clearTimeout(timers.stop);
    clearInterval(timers.tick);
  };
  const fail = (): void => {
    if (cancelled || finished) return;
    cancelled = true;
    chunks = [];
    clearTimers();
    stopTracks();
    callbacks.error();
  };
  const stop = (): void => {
    clearTimers();
    try {
      if (recorder.state === "recording") recorder.stop();
    } catch {
      fail();
    }
  };
  recorder.addEventListener("dataavailable", (event) => {
    if (!cancelled && !finished && event.data.size > 0) {
      totalBytes += event.data.size;
      if (totalBytes > EXTENDED_WARRANTY_INSTALLATION_VIDEO_MAX_BYTES) {
        fail();
        return;
      }
      chunks.push(event.data);
    }
  });
  recorder.addEventListener("error", fail, { once: true });
  recorder.addEventListener(
    "stop",
    () => {
      clearTimers();
      stopTracks();
      if (cancelled || finished) return;
      const stoppedAt = Date.now();
      const measuredDuration = stoppedAt - startedAt;
      if (
        measuredDuration < 1 ||
        measuredDuration > 62_000 ||
        chunks.length === 0
      ) {
        fail();
        return;
      }
      const contentType = recorder.mimeType
        .split(";", 1)[0]
        ?.trim()
        .toLowerCase();
      if (contentType !== "video/mp4" && contentType !== "video/webm") {
        fail();
        return;
      }
      finished = true;
      const blob = new Blob(chunks, { type: contentType });
      chunks = [];
      callbacks.complete({
        blob,
        contentType,
        metadata: {
          recordedAt: new Date(startedAt).toISOString(),
          recordingStartedAt: new Date(startedAt).toISOString(),
          recordingStoppedAt: new Date(stoppedAt).toISOString(),
          durationMs: Math.min(60_000, measuredDuration),
        },
      });
    },
    { once: true },
  );
  try {
    recorder.start(1_000);
  } catch (error) {
    cancelled = true;
    chunks = [];
    stopTracks();
    throw error;
  }
  timers.tick = setInterval(() => {
    callbacks.tick(Math.min(60_000, Date.now() - startedAt));
  }, 250);
  timers.stop = setTimeout(stop, 60_000);
  return {
    stop,
    cancel: () => {
      cancelled = true;
      chunks = [];
      stop();
      stopTracks();
    },
  };
}
