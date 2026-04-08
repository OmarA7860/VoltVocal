import "server-only";

import type { EstimateResult } from "@/types/estimate";
import {
  LIMITS,
  sanitizeEstimateResult,
  sanitizePlainText,
  truncateField,
} from "@/lib/sanitize-ai-text";

const WHISPER_MODEL = "whisper-large-v3-turbo";
const DEFAULT_CHAT_MODEL = "llama-3.3-70b-versatile";

const ESTIMATOR_SYSTEM = `You are a Master Electrical Estimator with 30 years of experience and an expert in the 2026 National Electrical Code (NEC). 

Your goal is to turn voice transcripts into professional, code-compliant estimates specifically for the Ontario/Canadian market but using NEC 2026 as the safety gold standard.

STRICT RULES:
1. CODE CITATIONS: For safety-related items, you MUST cite the specific 2026 NEC article (e.g., NEC 210.8 for GFCI) in the "proRecommendation" field.
2. WET AREAS: If a kitchen, bathroom, laundry, or outdoor area is mentioned, you MUST explicitly include or recommend GFCI-protected receptacles.
3. GRANULARITY: Use professional terminology. Instead of "outlet", use "20A Tamper-Resistant Receptacle". Instead of "wire", use "12/2 Romex".
4. LABOR RULE — THIS IS CRITICAL:
   Professional Labor line item MUST follow this exact format:
   - unit: 'hr' always
   - unitPrice: 125 always. Never put anything other than 125 here.
   - quantity: the NUMBER OF HOURS worked. This is the ONLY field
     that changes. If 3 hours, quantity is 3. If 4 hours, quantity
     is 4. Never set quantity to 1 unless exactly 1 hour was mentioned.

   WRONG: quantity: 1, unitPrice: 375
   RIGHT: quantity: 3, unitPrice: 125, lineTotal: 375

   The lineTotal must always equal quantity × 125.
   - Set "isEstimated": true on any labor line whose hours you calculated automatically.
   - Set "isEstimated": false ONLY if the contractor explicitly stated the number of hours in the transcript.
5. FORMATTING: Use clean bullet points in the proRecommendation column.

Required JSON shape:
{
  "lineItems": [
    {
      "description": "string",
      "quantity": number,
      "unit": "string",
      "unitPrice": number,
      "lineTotal": number,
      "proRecommendation": "string",
      "isEstimated": boolean
    }
  ],
  "total": number,
  "notes": "string"
}

Respond with ONLY valid JSON. No markdown code fences, no commentary.`;

function groqKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error("CONFIG_MISSING");
  }
  return key;
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
  const raw = fence ? fence[1].trim() : trimmed;
  return JSON.parse(raw);
}

function normalizeEstimate(raw: unknown): EstimateResult {
  if (!raw || typeof raw !== "object") {
    throw new Error("INVALID_MODEL_OUTPUT");
  }
  const o = raw as Record<string, unknown>;
  const items = Array.isArray(o.lineItems) ? o.lineItems : [];
  const lineItems = items.map((row, i) => {
    const r = row as Record<string, unknown>;
    const qty = Number(r.quantity);
    const quantity = Number.isFinite(qty) ? qty : 1;
    const unitPrice = Number(r.unitPrice);
    const safeUnitPrice = Number.isFinite(unitPrice) ? unitPrice : 0;
    const lineTotalRaw = Number(r.lineTotal);
    const lineTotal = Number.isFinite(lineTotalRaw)
      ? lineTotalRaw
      : quantity * safeUnitPrice;
    return {
      description: String(r.description ?? `Line item ${i + 1}`),
      quantity,
      unit: String(r.unit ?? "each"),
      unitPrice: safeUnitPrice,
      lineTotal,
      proRecommendation: String(
        r.proRecommendation ?? r.pro_recommendation ?? "",
      ),
      isEstimated: typeof r.isEstimated === "boolean" ? r.isEstimated : undefined,
    };
  });
  const totalRaw = Number(o.total);
  const total = Number.isFinite(totalRaw)
    ? totalRaw
    : lineItems.reduce((s, x) => s + x.lineTotal, 0);
  return {
    lineItems,
    total,
    notes: String(o.notes ?? ""),
  };
}

export async function transcribeWithGroq(file: File): Promise<string> {
  const key = groqKey();

  const body = new FormData();
  body.append("file", file, file.name || "recording.webm");
  body.append("model", WHISPER_MODEL);
  body.append("response_format", "json");

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body,
  });

  if (!res.ok) {
    if (process.env.NODE_ENV === "development") {
      console.error("[Groq transcribe]", res.status, await res.clone().text());
    }
    throw new Error("TRANSCRIPTION_UPSTREAM");
  }

  const data = (await res.json()) as { text?: string };
  if (!data.text?.trim()) {
    throw new Error("TRANSCRIPTION_EMPTY");
  }

  const cleaned = sanitizePlainText(data.text, { preserveNewlines: true });
  return truncateField(cleaned, LIMITS.transcript);
}

export async function estimateWithGroq(transcript: string): Promise<EstimateResult> {
  const key = groqKey();
  const model = process.env.GROQ_MODEL ?? DEFAULT_CHAT_MODEL;

  const userContent = `Transcript from job-site voice note:\n"""${transcript}"""`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: ESTIMATOR_SYSTEM },
        { role: "user", content: userContent },
      ],
      temperature: 0.2,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    if (process.env.NODE_ENV === "development") {
      console.error("[Groq chat]", res.status, await res.clone().text());
    }
    throw new Error("ESTIMATE_UPSTREAM");
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text?.trim()) {
    throw new Error("ESTIMATE_EMPTY");
  }

  let parsed: unknown;
  try {
    parsed = extractJsonObject(text);
  } catch {
    throw new Error("ESTIMATE_INVALID_JSON");
  }

  const normalized = normalizeEstimate(parsed);
  return sanitizeEstimateResult(normalized);
}
