import "server-only";

import type { EstimateResult } from "@/types/estimate";
import type { PriceItem } from "@/types/price";
import {
  LIMITS,
  sanitizeEstimateResult,
  sanitizePlainText,
  truncateField,
} from "@/lib/sanitize-ai-text";

const WHISPER_MODEL = "whisper-large-v3-turbo";
const DEFAULT_CHAT_MODEL = "llama-3.3-70b-versatile";

const ESTIMATOR_SYSTEM = `You are a transcription structuring tool for electrical contractors. Your only job is to convert a voice note into a clean structured estimate using ONLY what was explicitly stated. You do not add knowledge, guess prices, invent line items, or provide advice.

ABSOLUTE RULES — NEVER BREAK THESE:

PRICES:
- If the contractor stated a price, use that exact number
- If no price was stated, set unitPrice to 0
- Never guess, estimate, or use market rates
- Exception: labor unitPrice is always 125 if labor is mentioned without a price

QUANTITIES:
- If the contractor stated a quantity, use that exact number
- If no quantity was stated, set quantity to 1
- Never assume a quantity

LINE ITEMS:
- Only create line items for things explicitly mentioned
- Never add anything that was not spoken
- Never add permits, inspections, disposal fees, or extras
- Never add labor unless the contractor mentioned it

NAMES:
- Use professional electrical trade names for items
- "outlet" → "Electrical Receptacle"
- "breaker" → "Circuit Breaker"
- "panel" → "Electrical Panel"
- "light" → "Light Fixture"
- "switch" → "Light Switch"
- "wire" → "Electrical Cable"
- "pipe" → "Conduit"
- For anything unclear use the exact word the contractor said
- This is the ONLY thing you add beyond what was stated

PRO RECOMMENDATION:
Use only to flag missing information. Nothing else.
Use exactly one of these or leave empty string:
- "Price not specified — update before sending"
- "Quantity not confirmed — verify before sending"
- "Price and quantity not specified — update before sending"
- "" (empty — if price AND quantity were both clearly stated)

Never write code citations here.
Never write compliance notes here.
Never write installation advice here.
Never write anything except the exact phrases above.

LABOR RULES:
- Only include labor if the contractor mentioned it
- unitPrice is always exactly 125
- quantity equals the number of hours stated
- If hours not stated, quantity is 1 and proRecommendation is "Hours not confirmed — update before sending"

MATH RULES:
- lineTotal must equal quantity × unitPrice exactly
- total must equal sum of all lineTotals exactly
- Never round incorrectly

NOTES FIELD:
- Only include if the contractor said something that does not fit a line item
- If nothing extra was said, use empty string ""
- Never add advice, warnings, or code references here

OUTPUT:
- Valid JSON only
- No markdown fences
- No commentary before or after
- No explanations

Example input:
"I need 3 outlets at 85 dollars each and 2 hours labor"

Example output:
{
  "lineItems": [
    {
      "description": "Electrical Receptacle",
      "quantity": 3,
      "unit": "each",
      "unitPrice": 85,
      "lineTotal": 255,
      "proRecommendation": ""
    },
    {
      "description": "Professional Labor",
      "quantity": 2,
      "unit": "hr",
      "unitPrice": 125,
      "lineTotal": 250,
      "proRecommendation": ""
    }
  ],
  "total": 505,
  "notes": ""
}

Example input:
"Need some outlets and a panel"

Example output:
{
  "lineItems": [
    {
      "description": "Electrical Receptacle",
      "quantity": 1,
      "unit": "each",
      "unitPrice": 0,
      "lineTotal": 0,
      "proRecommendation": "Price and quantity not specified — update before sending"
    },
    {
      "description": "Electrical Panel",
      "quantity": 1,
      "unit": "each",
      "unitPrice": 0,
      "lineTotal": 0,
      "proRecommendation": "Price and quantity not specified — update before sending"
    }
  ],
  "total": 0,
  "notes": ""
}`;

function groqKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error("CONFIG_MISSING");
  }
  return key;
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  // Try markdown code fence (anywhere in the response)
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return JSON.parse(fence[1].trim());
  // Try parsing the whole response directly
  try {
    return JSON.parse(trimmed);
  } catch {
    // Fall back to finding the first {...} block in the response
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("No JSON found");
  }
}

function normalizeEstimate(raw: unknown): EstimateResult {
  if (!raw || typeof raw !== "object") {
    throw new Error("INVALID_MODEL_OUTPUT");
  }
  const o = raw as Record<string, unknown>;
  // Llama 3.3 sometimes returns snake_case "line_items" instead of camelCase "lineItems"
  const items = Array.isArray(o.lineItems)
    ? o.lineItems
    : Array.isArray(o.line_items)
    ? o.line_items
    : [];
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

export async function estimateWithGroq(
  transcript: string,
  priceList: PriceItem[] = [],
): Promise<EstimateResult> {
  const key = groqKey();
  const model = process.env.GROQ_MODEL ?? DEFAULT_CHAT_MODEL;

  const userContent = `Transcript from job-site voice note:\n"""${transcript}"""`;

  const systemContent =
    priceList.length > 0
      ? `${ESTIMATOR_SYSTEM}\n\nCONTRACTOR PRICE LIST — USE THESE EXACT PRICES:\n${priceList
          .map((item) => `${item.name}: $${item.unit_price} per ${item.unit}`)
          .join("\n")}\nIf an item mentioned matches something in this list, use that exact price. Do not guess.`
      : ESTIMATOR_SYSTEM;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemContent },
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
    console.error("[Groq estimate] model returned empty content");
    throw new Error("ESTIMATE_EMPTY");
  }

  let parsed: unknown;
  try {
    parsed = extractJsonObject(text);
  } catch {
    console.error("[Groq estimate] JSON parse failed. Raw model output:", text.slice(0, 500));
    throw new Error("ESTIMATE_INVALID_JSON");
  }

  const normalized = normalizeEstimate(parsed);

  if (normalized.lineItems.length === 0) {
    console.error("[Groq estimate] model returned 0 line items. Raw model output:", text.slice(0, 500));
    throw new Error("ESTIMATE_EMPTY");
  }

  return sanitizeEstimateResult(normalized);
}
