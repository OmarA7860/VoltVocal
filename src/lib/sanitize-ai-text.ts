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
 * Strips control characters, invisible Unicode, and normalizes text for safe
 * display (React text) and PDF output. Does not HTML-escape — React handles that.
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
  const s = truncateField(sanitizePlainText(input), LIMITS.companyNamePdf);
  return s || "JobSite Estimate";
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
