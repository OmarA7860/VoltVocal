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
  client_name: string;
  client_address: string;
  status: string;
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
      return "No speech detected. Try a clearer recording.";
    case "ESTIMATE_EMPTY":
      return "No line items were returned. Try speaking more detail — name the materials, quantities, and any prices.";
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

    // Fetch price list for context injection — best-effort, never blocks the estimate
    let priceList: import("@/types/price").PriceItem[] = [];
    try {
      const { getSupabaseClient } = await import("@/lib/server/supabase");
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from("price_list")
        .select("id, created_at, name, unit, unit_price, category")
        .order("name");
      if (data) priceList = data;
    } catch {
      // price list unavailable — proceed without it
    }

    const estimate = await estimateWithGroq(trimmed, priceList);
    return { ok: true, estimate };
  } catch (e) {
    return { ok: false, error: mapError(e) };
  }
}

export async function saveEstimateAction(
  transcript: string,
  estimate: EstimateResult,
  clientName?: string,
  clientAddress?: string,
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
    const validatedClientName = truncateField(sanitizeUserEditedText(clientName ?? "", 200), 200);
    const validatedClientAddress = truncateField(sanitizeUserEditedText(clientAddress ?? "", 300), 300);

    const { data, error } = await supabase
      .from("estimates")
      .insert({
        transcript: cleanTranscript,
        total: validatedTotal,
        notes: validatedNotes,
        line_items: validatedLineItems,
        client_name: validatedClientName,
        client_address: validatedClientAddress,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) throw new Error("DB_INSERT_FAILED");
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: mapError(e) };
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function deleteEstimateAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (!id || typeof id !== "string" || !UUID_RE.test(id)) {
      return { ok: false, error: "Invalid estimate ID." };
    }

    const key = await rateLimitKey("del");
    if (!checkRateLimit(key)) {
      return { ok: false, error: "Too many requests. Please wait a few minutes." };
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
    const key = await rateLimitKey("get");
    if (!checkRateLimit(key)) {
      return { ok: false, error: "Too many requests. Please wait a few minutes." };
    }

    const { getSupabaseClient } = await import("@/lib/server/supabase");
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("estimates")
      .select("id, created_at, total, notes, transcript, line_items, client_name, client_address, status")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error("DB_FETCH_FAILED");
    return { ok: true, estimates: data ?? [] };
  } catch (e) {
    return { ok: false, error: mapError(e) };
  }
}

const VALID_STATUSES = ["pending", "sent", "accepted", "declined"] as const;

export async function updateEstimateStatusAction(
  id: string,
  status: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (!id || typeof id !== "string" || !UUID_RE.test(id)) {
      return { ok: false, error: "Invalid estimate ID." };
    }
    if (!VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
      return { ok: false, error: "Invalid status." };
    }

    const key = await rateLimitKey("upd");
    if (!checkRateLimit(key)) {
      return { ok: false, error: "Too many requests. Please wait a few minutes." };
    }

    const { getSupabaseClient } = await import("@/lib/server/supabase");
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from("estimates")
      .update({ status })
      .eq("id", id);

    if (error) throw new Error("DB_INSERT_FAILED");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: mapError(e) };
  }
}