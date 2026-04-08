import type { EstimateLineItem, EstimateResult } from "@/types/estimate";

/** Max length per text field to limit abuse / memory (server-enforced). */
export const LIMITS = {
  description: 8000,
  unit: 120,
  proRecommendation: 12000,
  notes: 20000,
  transcript: 100_000,
  companyNamePdf: 200,
} as const;

/**
 * Strips control characters, invisible Unicode, XSS patterns, and normalizes
 * text for safe display (React text) and PDF output.
 * Does not HTML-escape — React handles that for component output.
 */
export function sanitizePlainText(
  input: string,
  options?: { preserveNewlines?: boolean },
): string {
  if (typeof input !== "string") return "";
  let s = input.replace(/\0/g, "");

  if (options?.preserveNewlines) {
    s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  } else {
    s = s.replace(/[\x00-\x1F\x7F]/g, " ");
  }

  s = s.replace(/[\u200B-\u200D\uFEFF\u202A-\u202E\u2066-\u2069]/g, "");

  // XSS pattern stripping
  s = s.replace(/(<script[\s\S]*?>[\s\S]*?<\/script>)/gi, "");
  s = s.replace(/javascript\s*:/gi, "");
  s = s.replace(/on\w+\s*=/gi, "");
  s = s.replace(/<[^>]+>/g, "");

  try {
    s = s.normalize("NFKC");
  } catch {
    /* ignore */
  }

  return s.trim();
}

export function truncateField(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export function sanitizeCompanyNameForPdf(input: string): string {
  const s = truncateField(
    sanitizePlainText(input).replace(/[<>'"&]/g, ""),
    100,
  );
  return s || "JobSite Estimate";
}

/**
 * Clamps and round-trips a numeric value through Number().
 * Returns fallback for NaN / Infinity / out-of-range.
 */
export function sanitizeNumericInput(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  if (n < min) return min;
  if (n > max) return max;
  return Math.round(n * 100) / 100;
}

/**
 * Sanitizes text entered by the user in edit inputs before storing or sending.
 * Strips HTML tags and dangerous patterns, entity-encodes remaining angle
 * brackets and quotes, then truncates.
 */
export function sanitizeUserEditedText(
  input: string,
  maxLength = 300,
): string {
  let s = String(input);
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  s = s.replace(/<[^>]+>/g, "");
  s = s.replace(/javascript\s*:/gi, "");
  s = s.replace(/on\w+\s*=/gi, "");
  s = s.replace(/[<>'"]/g, (c) => (({ "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" } as Record<string, string>)[c] ?? c));
  return truncateField(s.trim(), maxLength);
}

export function sanitizeEstimateResult(raw: EstimateResult): EstimateResult {
  const lineItems: EstimateLineItem[] = raw.lineItems.map((row) => ({
    description: truncateField(
      sanitizePlainText(row.description),
      LIMITS.description,
    ),
    quantity: Number.isFinite(row.quantity) ? row.quantity : 1,
    unit: truncateField(sanitizePlainText(row.unit), LIMITS.unit),
    unitPrice: Number.isFinite(row.unitPrice) ? row.unitPrice : 0,
    lineTotal: Number.isFinite(row.lineTotal) ? row.lineTotal : 0,
    proRecommendation: truncateField(
      sanitizePlainText(row.proRecommendation),
      LIMITS.proRecommendation,
    ),
    isEstimated: typeof row.isEstimated === "boolean" ? row.isEstimated : undefined,
  }));

  const total = Number.isFinite(raw.total) ? raw.total : 0;

  return {
    lineItems,
    total,
    notes: truncateField(
      sanitizePlainText(raw.notes, { preserveNewlines: true }),
      LIMITS.notes,
    ),
  };
}

/** Client-side PDF path: re-sanitize before writing to jsPDF. */
export function sanitizeEstimateForPdfExport(estimate: EstimateResult): EstimateResult {
  return sanitizeEstimateResult(estimate);
}
