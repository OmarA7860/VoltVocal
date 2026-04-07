"use server";

import { headers } from "next/headers";
import type { EstimateResult } from "@/types/estimate";
import { validateAudioFile } from "@/lib/audio-validation";
import {
  LIMITS,
  sanitizePlainText,
  truncateField,
} from "@/lib/sanitize-ai-text";
import {
  estimateWithGroq,
  transcribeWithGroq,
} from "@/lib/server/groq-estimate";
import { checkRateLimit } from "@/lib/server/rate-limit";

async function rateLimitKey(prefix: string): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  const ip =
    xff?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    h.get("cf-connecting-ip") ??
    "unknown";
  return `${prefix}:${ip}`;
}

function mapError(e: unknown): string {
  if (!(e instanceof Error)) {
    return "Something went wrong. Please try again.";
  }
  switch (e.message) {
    case "CONFIG_MISSING":
      return "Service is not configured. Please contact support.";
    case "TRANSCRIPTION_UPSTREAM":
    case "ESTIMATE_UPSTREAM":
      return "The AI service is temporarily unavailable. Try again shortly.";
    case "TRANSCRIPTION_EMPTY":
    case "ESTIMATE_EMPTY":
      return "No result was returned. Try a clearer recording.";
    case "ESTIMATE_INVALID_JSON":
      return "Could not parse the estimate. Try recording again with more detail.";
    case "INVALID_MODEL_OUTPUT":
      return "Invalid response from the model. Please try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export async function transcribeAudioAction(
  formData: FormData,
): Promise<
  { ok: true; transcript: string } | { ok: false; error: string }
> {
  try {
    const key = await rateLimitKey("tr");
    if (!checkRateLimit(key)) {
      return {
        ok: false,
        error: "Too many requests. Please wait a few minutes.",
      };
    }

    const audio = formData.get("audio");
    if (!(audio instanceof File)) {
      return { ok: false, error: "No audio file was uploaded." };
    }

    const v = validateAudioFile(audio);
    if (!v.ok) {
      return { ok: false, error: v.error };
    }

    const transcript = await transcribeWithGroq(audio);
    return { ok: true, transcript };
  } catch (e) {
    return { ok: false, error: mapError(e) };
  }
}

export async function generateEstimateAction(
  transcript: string,
): Promise<
  { ok: true; estimate: EstimateResult } | { ok: false; error: string }
> {
  try {
    const key = await rateLimitKey("est");
    if (!checkRateLimit(key)) {
      return {
        ok: false,
        error: "Too many requests. Please wait a few minutes.",
      };
    }

    const t = sanitizePlainText(transcript, { preserveNewlines: true });
    const trimmed = truncateField(t, LIMITS.transcript);
    if (!trimmed) {
      return { ok: false, error: "Transcript is empty." };
    }

    const estimate = await estimateWithGroq(trimmed);
    return { ok: true, estimate };
  } catch (e) {
    return { ok: false, error: mapError(e) };
  }
}
