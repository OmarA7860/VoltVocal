"use server";

import { headers } from "next/headers";
import type { EstimateResult } from "@/types/estimate";
import { validateAudioFile } from "@/lib/audio-validation";
import {
  LIMITS,
  sanitizePlainText,
  sanitizeNumericInput,
  sanitizeUserEditedText,
  truncateField,
} from "@/lib/sanitize-ai-text";
import {
  estimateWithGroq,
  transcribeWithGroq,
} from "@/lib/server/groq-estimate";
import { checkRateLimit } from "@/lib/server/rate-limit";

type SavedEstimate = {
  id: string;
  created_at: string;
  total: number;
  notes: string;
  transcript: string;
  line_items: EstimateResult["lineItems"];
};

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
    case "DB_INSERT_FAILED":
      return "Could not save the estimate. Please try again.";
    case "DB_DELETE_FAILED":
      return "Could not delete the estimate. Please try again.";
    case "DB_FETCH_FAILED":
      return "Could not load saved estimates. Please refresh.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export async function transcribeAudioAction(
  formData: FormData,
): Promise<{ ok: true; transcript: string } | { ok: false; error: string }> {
  try {
    const key = await rateLimitKey("tr");
    if (!checkRateLimit(key)) {
      return { ok: false, error: "Too many requests. Please wait a few minutes." };
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
): Promise<{ ok: true; estimate: EstimateResult } | { ok: false; error: string }> {
  try {
    const key = await rateLimitKey("est");
    if (!checkRateLimit(key)) {
      return { ok: false, error: "Too many requests. Please wait a few minutes." };
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

export async function saveEstimateAction(
  transcript: string,
  estimate: EstimateResult,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const key = await rateLimitKey("save");
    if (!checkRateLimit(key)) {
      return { ok: false, error: "Too many requests. Please wait a few minutes." };
    }

    const { getSupabaseClient } = await import("@/lib/server/supabase");
    const supabase = getSupabaseClient();

    if (estimate.lineItems.length === 0) {
      return { ok: false, error: "Estimate has no line items." };
    }
    if (estimate.lineItems.length > 50) {
      return { ok: false, error: "Too many line items." };
    }

    const cleanTranscript = truncateField(
      sanitizePlainText(transcript, { preserveNewlines: true }),
      LIMITS.transcript,
    );

    const validatedLineItems = estimate.lineItems.map((item) => ({
      description: sanitizeUserEditedText(item.description, 300),
      quantity: sanitizeNumericInput(item.quantity, 0.5, 9999, 1),
      unit: sanitizeUserEditedText(item.unit, 50),
      unitPrice: sanitizeNumericInput(item.unitPrice, 0, 99999, 0),
      lineTotal: sanitizeNumericInput(item.lineTotal, 0, 9_999_999, 0),
      proRecommendation: truncateField(sanitizePlainText(item.proRecommendation), 500),
      isEstimated: Boolean(item.isEstimated),
    }));

    const validatedTotal = sanitizeNumericInput(estimate.total, 0, 9_999_999, 0);
    const validatedNotes = truncateField(
      sanitizePlainText(estimate.notes, { preserveNewlines: true }),
      1000,
    );

    const { data, error } = await supabase
      .from("estimates")
      .insert({
        transcript: cleanTranscript,
        total: validatedTotal,
        notes: validatedNotes,
        line_items: validatedLineItems,
      })
      .select("id")
      .single();

    if (error) throw new Error("DB_INSERT_FAILED");
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: mapError(e) };
  }
}

export async function deleteEstimateAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (!id || typeof id !== "string" || id.length > 100) {
      return { ok: false, error: "Invalid estimate ID." };
    }

    const { getSupabaseClient } = await import("@/lib/server/supabase");
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from("estimates")
      .delete()
      .eq("id", id);

    if (error) throw new Error("DB_DELETE_FAILED");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: mapError(e) };
  }
}

export async function getEstimatesAction(): Promise<
  { ok: true; estimates: SavedEstimate[] } | { ok: false; error: string }
> {
  try {
    const { getSupabaseClient } = await import("@/lib/server/supabase");
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("estimates")
      .select("id, created_at, total, notes, transcript, line_items")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error("DB_FETCH_FAILED");
    return { ok: true, estimates: data ?? [] };
  } catch (e) {
    return { ok: false, error: mapError(e) };
  }
}