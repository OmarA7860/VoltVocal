"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  FileText,
  Loader2,
  Mic,
  Square,
} from "lucide-react";
import { transcribeAudioAction, generateEstimateAction } from "@/app/actions/estimate-actions";
import { EstimateTable } from "@/components/estimate-table";
import type { EstimateResult } from "@/types/estimate";

export type PipelinePhase =
  | "idle"
  | "recording"
  | "transcribing"
  | "generating";

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return undefined;
}

function audioFileName(mime: string): string {
  if (mime.includes("mp4")) return "recording.m4a";
  if (mime.includes("mpeg")) return "recording.mp3";
  return "recording.webm";
}

async function postTranscribe(blob: Blob): Promise<string> {
  const name = audioFileName(blob.type);
  const file = new File([blob], name, {
    type: blob.type || "audio/webm",
  });
  const form = new FormData();
  form.append("audio", file);

  const result = await transcribeAudioAction(form);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.transcript;
}

async function postEstimate(transcript: string): Promise<EstimateResult> {
  const result = await generateEstimateAction(transcript);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.estimate;
}

export function EstimateRecorder() {
  const [phase, setPhase] = useState<PipelinePhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      stopTimer();
      cleanupStream();
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, [cleanupStream, stopTimer]);

  const runPipelineAfterRecording = useCallback(async (blob: Blob) => {
    setError(null);
    setEstimate(null);
    try {
      setPhase("transcribing");
      const transcript = await postTranscribe(blob);

      setPhase("generating");
      const result = await postEstimate(transcript);
      setEstimate(result);
      setPhase("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPhase("idle");
    }
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Microphone access is not available in this browser.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setError("Recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = () => {
        cleanupStream();
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType || "audio/webm",
        });
        chunksRef.current = [];
        mediaRecorderRef.current = null;
        void runPipelineAfterRecording(blob);
      };

      recorder.start(250);
      setElapsedSec(0);
      stopTimer();
      timerRef.current = setInterval(() => {
        setElapsedSec((s) => s + 1);
      }, 1000);
      setPhase("recording");
    } catch (e) {
      cleanupStream();
      setError(
        e instanceof Error
          ? e.message
          : "Could not access the microphone.",
      );
    }
  }, [cleanupStream, runPipelineAfterRecording, stopTimer]);

  const stopRecording = useCallback(() => {
    stopTimer();
    setElapsedSec(0);
    const rec = mediaRecorderRef.current;
    if (rec && rec.state === "recording") {
      rec.stop();
    } else {
      cleanupStream();
      setPhase("idle");
    }
  }, [cleanupStream, stopTimer]);

  const busy = phase === "transcribing" || phase === "generating";

  return (
    <div className="flex w-full max-w-4xl flex-col gap-8">
      <div
        className="mx-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
        aria-live="polite"
      >
        {phase === "idle" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Record a walkthrough of the job. Groq transcribes with Whisper,
              then Llama turns it into line items and totals.
            </p>
            <button
              type="button"
              onClick={() => void startRecording()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-4 text-base font-semibold text-white shadow-md transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
            >
              <Mic className="size-5 shrink-0" aria-hidden />
              Record New Estimate
            </button>
          </div>
        )}

        {phase === "recording" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex items-center gap-2 text-lg font-semibold text-red-600 dark:text-red-400">
              <span className="relative flex size-3">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex size-3 rounded-full bg-red-500" />
              </span>
              Recording…
            </div>
            <p className="font-mono text-2xl tabular-nums text-zinc-800 dark:text-zinc-200">
              {String(Math.floor(elapsedSec / 60)).padStart(2, "0")}
              :
              {String(elapsedSec % 60).padStart(2, "0")}
            </p>
            <button
              type="button"
              onClick={stopRecording}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-zinc-50 px-6 py-3 text-base font-medium text-zinc-900 transition hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus-visible:ring-offset-zinc-950"
            >
              <Square className="size-4 fill-current" aria-hidden />
              Stop
            </button>
          </div>
        )}

        {phase === "transcribing" && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Loader2
              className="size-10 animate-spin text-emerald-600 dark:text-emerald-400"
              aria-hidden
            />
            <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              Transcribing…
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Sending audio to the transcription API.
            </p>
          </div>
        )}

        {phase === "generating" && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="relative flex size-14 items-center justify-center">
              <Loader2
                className="size-11 animate-spin text-emerald-600 dark:text-emerald-400"
                aria-hidden
              />
              <FileText
                className="pointer-events-none absolute size-5 text-emerald-800 dark:text-emerald-200"
                aria-hidden
              />
            </div>
            <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              Generating estimate…
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Llama is turning your transcript into line items and totals.
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200">
          {error}
        </p>
      )}

      {busy && (
        <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
          Please keep this tab open until we finish.
        </p>
      )}

      {estimate && phase === "idle" && !error && (
        <EstimateTable estimate={estimate} />
      )}
    </div>
  );
}
