"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { FileText, Mic, Square } from "lucide-react";
import { transcribeAudioAction, generateEstimateAction } from "@/app/actions/estimate-actions";
import { EstimateTable } from "@/components/estimate-table";
import type { EstimateResult } from "@/types/estimate";

export type PipelinePhase =
  | "idle"
  | "recording"
  | "transcribing"
  | "generating";

// Fixed waveform heights (deterministic — avoids hydration mismatch)
const WAVE_HEIGHTS = [35, 65, 48, 88, 55, 78, 42, 95, 52, 72, 38, 82, 60, 44, 90, 50, 68, 33, 75, 58];


function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
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
  const file = new File([blob], name, { type: blob.type || "audio/webm" });
  const form = new FormData();
  form.append("audio", file);
  const result = await transcribeAudioAction(form);
  if (!result.ok) throw new Error(result.error);
  return result.transcript;
}

async function postEstimate(transcript: string): Promise<EstimateResult> {
  const result = await generateEstimateAction(transcript);
  if (!result.ok) throw new Error(result.error);
  return result.estimate;
}

export function EstimateRecorder() {
  const [phase, setPhase] = useState<PipelinePhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      stopTimer();
      cleanupStream();
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    };
  }, [cleanupStream, stopTimer]);

  const runPipelineAfterRecording = useCallback(async (blob: Blob) => {
    setError(null);
    setEstimate(null);
    setTranscript(null);
    try {
      setPhase("transcribing");
      const t = await postTranscribe(blob);
      setTranscript(t);
      setPhase("generating");
      const result = await postEstimate(t);
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
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (ev) => { if (ev.data.size > 0) chunksRef.current.push(ev.data); };
      recorder.onstop = () => {
        cleanupStream();
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || "audio/webm" });
        chunksRef.current = [];
        mediaRecorderRef.current = null;
        void runPipelineAfterRecording(blob);
      };
      recorder.start(250);
      setElapsedSec(0);
      stopTimer();
      timerRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);
      setPhase("recording");
    } catch (e) {
      cleanupStream();
      setError(e instanceof Error ? e.message : "Could not access the microphone.");
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
  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
  const ss = String(elapsedSec % 60).padStart(2, "0");

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Main control card */}
      <div
        className="w-full overflow-hidden rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
        style={{ background: "rgba(58,143,95,0.03)", border: "1px solid rgba(58,143,95,0.2)" }}
        aria-live="polite"
      >
        {/* Status bar */}
        <div className="flex items-center justify-between border-b border-[#1E3025] bg-[#0B1210]/80 px-5 py-2.5">
          <span className="text-[10px] font-bold tracking-[0.25em] text-[#4A6857] uppercase">
            Audio Input
          </span>
          <span className={`flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase font-mono transition-colors ${
            phase === "recording"
              ? "text-red-400"
              : phase === "transcribing" || phase === "generating"
              ? "text-[#4DB87B]"
              : "text-[#4A6857]"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${
              phase === "recording" ? "bg-red-400 animate-pulse"
              : phase === "transcribing" || phase === "generating" ? "bg-[#4DB87B] animate-pulse"
              : "bg-[#2A4234]"
            }`} />
            {phase === "idle" && "Standby"}
            {phase === "recording" && `Rec  ${mm}:${ss}`}
            {phase === "transcribing" && "Transcribing"}
            {phase === "generating" && "Processing"}
          </span>
        </div>

        <div className="px-6 py-12">
          {/* ── IDLE ── */}
          {phase === "idle" && (
            <div className="animate-fade-in flex flex-col items-center">
              <button
                type="button"
                onClick={() => void startRecording()}
                className="record-btn"
                aria-label="Start recording"
              >
                <Image
                  src="/logo-mark.png"
                  alt="Record"
                  width={64}
                  height={64}
                  style={{ objectFit: "contain", filter: "brightness(0) invert(1)" }}
                  priority
                />
              </button>
              <div className="text-center mt-5">
                <p className="text-lg font-semibold text-white">Tap to start recording</p>
                <p className="mt-1 text-xs text-[#4A6857]">
                  Describe materials, quantities, and any notes aloud
                </p>
              </div>
            </div>
          )}

          {/* ── RECORDING ── */}
          {phase === "recording" && (
            <div className="animate-fade-in flex flex-col items-center gap-6">
              {/* Pulsing logo button */}
              <div className="record-btn record-btn-recording">
                <Image
                  src="/logo-mark.png"
                  alt="Recording"
                  width={64}
                  height={64}
                  style={{ objectFit: "contain", filter: "brightness(0) invert(1)" }}
                />
              </div>

              <div className="flex items-center justify-center gap-0.5 h-10 w-full max-w-xs">
                {WAVE_HEIGHTS.map((h, i) => (
                  <div
                    key={i}
                    className="wave-bar w-1 bg-red-400/80 rounded-full"
                    style={{
                      height: `${h}%`,
                      animationDelay: `${i * 0.035}s`,
                      animationDuration: `${0.55 + (i % 4) * 0.12}s`,
                    }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                </span>
                <span className="text-3xl font-mono font-bold tabular-nums text-[#E0EDE5]">
                  {mm}:{ss}
                </span>
              </div>

              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-3 rounded-xl border border-[#2A4234] bg-[#131E17] px-8 py-3 text-sm font-semibold text-[#E0EDE5] transition-all duration-200 hover:border-red-500/50 hover:bg-red-950/30 hover:text-red-300 active:scale-95 focus:outline-none"
              >
                <Square className="h-4 w-4 fill-current" />
                Stop Recording
              </button>
            </div>
          )}

          {/* ── TRANSCRIBING ── */}
          {phase === "transcribing" && (
            <div className="animate-fade-in flex flex-col items-center gap-5 py-2">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#131E17] ring-1 ring-[#2A4234]">
                <svg className="absolute h-16 w-16 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="#1E3025" strokeWidth="2" />
                  <circle cx="28" cy="28" r="24" fill="none" stroke="#3A8F5F" strokeWidth="2"
                    strokeDasharray="150.8" strokeDashoffset="37.7" strokeLinecap="round"
                    style={{ animation: "spin 1.4s linear infinite" }} />
                </svg>
                <Mic className="h-6 w-6 text-[#4DB87B]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-[#E0EDE5]">Transcribing audio…</p>
                <p className="mt-1 text-xs text-[#4A6857]">Groq Whisper is processing your recording</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3A8F5F] animate-bounce" style={{ animationDelay: "0s" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-[#3A8F5F] animate-bounce" style={{ animationDelay: "0.15s" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-[#3A8F5F] animate-bounce" style={{ animationDelay: "0.3s" }} />
              </div>
            </div>
          )}

          {/* ── GENERATING ── */}
          {phase === "generating" && (
            <div className="animate-fade-in flex flex-col items-center gap-5 py-2">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#131E17] ring-1 ring-[#2A4234]">
                <svg className="absolute h-16 w-16 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="#1E3025" strokeWidth="2" />
                  <circle cx="28" cy="28" r="24" fill="none" stroke="#4DB87B" strokeWidth="2"
                    strokeDasharray="150.8" strokeDashoffset="75.4" strokeLinecap="round"
                    style={{ animation: "spin 1s linear infinite" }} />
                </svg>
                <FileText className="h-6 w-6 text-[#4DB87B]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-[#E0EDE5]">Building estimate…</p>
                <p className="mt-1 text-xs text-[#4A6857]">Llama is generating line items and totals</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4DB87B] animate-bounce" style={{ animationDelay: "0s" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-[#4DB87B] animate-bounce" style={{ animationDelay: "0.15s" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-[#4DB87B] animate-bounce" style={{ animationDelay: "0.3s" }} />
              </div>
            </div>
          )}
        </div>

        {busy && (
          <div className="border-t border-[#1E3025] bg-[#0B1210]/60 px-5 py-2.5 text-center">
            <p className="text-[10px] tracking-widest text-[#4A6857] uppercase font-mono">
              Keep this tab open until processing completes
            </p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="animate-fade-up rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3">
          <p className="text-[10px] font-bold tracking-widest text-red-400 uppercase font-mono">Error</p>
          <p className="mt-1 text-sm text-red-300">{error}</p>
        </div>
      )}

      {estimate && phase === "idle" && !error && (
        <div className="animate-fade-up">
          <EstimateTable estimate={estimate} transcript={transcript ?? undefined} />
        </div>
      )}
    </div>
  );
}
