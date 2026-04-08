"use client";

import { useState } from "react";
import { Check, Download, Pencil, Save, Trash2, X } from "lucide-react";
import { downloadEstimatePdf } from "@/lib/estimate-pdf";
import { saveEstimateAction } from "@/app/actions/estimate-actions";
import {
  sanitizePlainText,
  sanitizeNumericInput,
  sanitizeUserEditedText,
} from "@/lib/sanitize-ai-text";
import type { EstimateLineItem, EstimateResult } from "@/types/estimate";

const money = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const DESC_MAX = 300;
const QTY_MIN = 0.5;
const QTY_MAX = 9999;
const PRICE_MIN = 0;
const PRICE_MAX = 99999;
const LINE_TOTAL_MAX = 9_999_999;

type Draft = { description: string; rawQty: string; rawPrice: string };

type Props = {
  estimate: EstimateResult;
  companyName?: string;
  transcript?: string;
  onDeleted?: () => void;
};

export function EstimateTable({ estimate, companyName, transcript, onDeleted }: Props) {
  const { notes } = estimate;
  const [lineItems, setLineItems] = useState<EstimateLineItem[]>(estimate.lineItems);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const grandTotal = lineItems.reduce((s, r) => s + r.lineTotal, 0);
  const hasEstimated = lineItems.some((r) => r.isEstimated === true);

  function startEdit(i: number) {
    const row = lineItems[i];
    setEditingIndex(i);
    setDraft({ description: row.description, rawQty: String(row.quantity), rawPrice: String(row.unitPrice) });
  }

  function cancelEdit() {
    setEditingIndex(null);
    setDraft(null);
  }

  function parseQty(raw: string, fallback: number): number {
    const n = parseFloat(raw);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return Math.round(Math.min(Math.max(n, QTY_MIN), QTY_MAX) * 100) / 100;
  }

  function parsePrice(raw: string, fallback: number): number {
    const n = parseFloat(raw);
    if (!Number.isFinite(n) || n < 0) return fallback;
    return Math.round(Math.min(Math.max(n, PRICE_MIN), PRICE_MAX) * 100) / 100;
  }

  function commitEdit() {
    if (editingIndex === null || !draft) return;
    const origRow = lineItems[editingIndex];
    const safeDesc = sanitizeUserEditedText(draft.description, DESC_MAX);
    const safeQty = parseQty(draft.rawQty, origRow.quantity);
    const safePrice = parsePrice(draft.rawPrice, origRow.unitPrice);
    const safeLineTotal = sanitizeNumericInput(safeQty * safePrice, 0, LINE_TOTAL_MAX, 0);
    setLineItems((prev) =>
      prev.map((row, i) =>
        i === editingIndex
          ? { ...row, description: safeDesc || row.description, quantity: safeQty, unitPrice: safePrice, lineTotal: safeLineTotal }
          : row,
      ),
    );
    setEditingIndex(null);
    setDraft(null);
  }

  function confirmEstimate(index: number) {
    setLineItems((prev) =>
      prev.map((row, i) => (i === index ? { ...row, isEstimated: false } : row)),
    );
  }

  async function handleSave() {
    if (!transcript) return;
    setIsSaving(true);
    setSaveError(null);
    const currentEstimate: EstimateResult = { lineItems, total: grandTotal, notes };
    const result = await saveEstimateAction(transcript, currentEstimate);
    setIsSaving(false);
    if (result.ok) {
      setSaved(true);
    } else {
      setSaveError(result.error);
    }
  }

  const draftLineTotal = (() => {
    if (draft === null || editingIndex === null) return 0;
    const q = parseFloat(draft.rawQty);
    const p = parseFloat(draft.rawPrice);
    if (Number.isFinite(q) && q > 0 && Number.isFinite(p) && p >= 0) {
      return sanitizeNumericInput(q * p, 0, LINE_TOTAL_MAX, 0);
    }
    return lineItems[editingIndex]?.lineTotal ?? 0;
  })();

  return (
    <div className="w-full border border-[#22222A] bg-[#151518]">
      {/* Panel header */}
      <div className="flex items-center justify-between border-b border-[#22222A] bg-[#0E0E11] px-4 py-2">
        <span className="text-[10px] font-bold tracking-[0.25em] text-[#8B8B99] uppercase font-mono">
          Estimate Output
        </span>
        <span className="text-[10px] font-mono tracking-widest text-[#7B3FE4] uppercase">
          ● Ready
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#22222A] bg-[#0E0E11] text-[10px] font-bold tracking-[0.2em] uppercase text-[#8B8B99] font-mono">
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3 text-right">Unit Price</th>
              <th className="px-4 py-3 text-right">Line Total</th>
              <th className="min-w-[220px] px-4 py-3 normal-case tracking-normal">
                Recommendations
              </th>
              <th className="w-8 px-2 py-3" aria-label="Actions" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1C1C22]">
            {lineItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#8B8B99] text-sm">
                  No line items returned. Try adding more detail in your recording.
                </td>
              </tr>
            ) : (
              lineItems.map((row, i) => {
                const isEditing = editingIndex === i;
                const base = i % 2 === 0 ? "bg-[#151518]" : "bg-[#0E0E11]";

                if (isEditing && draft !== null) {
                  const descLen = draft.description.length;
                  const nearLimit = descLen > 250;
                  return (
                    <tr key={`${row.description}-${i}`} className={`${base} ring-1 ring-inset ring-[#7B3FE4]`}>
                      {/* description */}
                      <td className="px-4 py-2">
                        <div className="flex flex-col gap-0.5">
                          <input
                            type="text"
                            value={draft.description}
                            maxLength={DESC_MAX}
                            onChange={(e) => {
                              const raw = e.target.value;
                              // Strip HTML tags and dangerous patterns on the fly
                              const safe = raw
                                .replace(/<[^>]+>/g, "")
                                .replace(/javascript\s*:/gi, "")
                                .replace(/on\w+\s*=/gi, "")
                                .slice(0, DESC_MAX);
                              setDraft((d) => d && { ...d, description: safe });
                            }}
                            onBlur={(e) =>
                              setDraft((d) => d && { ...d, description: sanitizeUserEditedText(e.target.value, DESC_MAX) })
                            }
                            className="w-full border border-[#3A3A44] bg-[#0E0E11] px-2 py-1 text-sm text-[#E4E4F0] font-medium outline-none focus:border-[#7B3FE4]"
                          />
                          {nearLimit && (
                            <span className="text-[9px] font-mono text-amber-400">
                              {descLen}/{DESC_MAX}
                            </span>
                          )}
                        </div>
                      </td>
                      {/* quantity */}
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={draft.rawQty}
                          onChange={(e) => setDraft((d) => d && { ...d, rawQty: e.target.value })}
                          onBlur={(e) => {
                            const safe = parseQty(e.target.value, lineItems[editingIndex].quantity);
                            setDraft((d) => d && { ...d, rawQty: String(safe) });
                          }}
                          onFocus={(e) => e.target.select()}
                          className="w-20 border border-[#3A3A44] bg-[#0E0E11] px-2 py-1 text-right text-sm font-mono text-[#E4E4F0] outline-none focus:border-[#7B3FE4]"
                        />
                      </td>
                      {/* unit — static */}
                      <td className="px-4 py-2 text-[#B0B0BE]">
                        {sanitizePlainText(row.unit)}
                      </td>
                      {/* unitPrice */}
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={draft.rawPrice}
                          onChange={(e) => setDraft((d) => d && { ...d, rawPrice: e.target.value })}
                          onBlur={(e) => {
                            const safe = parsePrice(e.target.value, lineItems[editingIndex].unitPrice);
                            setDraft((d) => d && { ...d, rawPrice: String(safe) });
                          }}
                          onFocus={(e) => e.target.select()}
                          className="w-28 border border-[#3A3A44] bg-[#0E0E11] px-2 py-1 text-right text-sm font-mono text-[#E4E4F0] outline-none focus:border-[#7B3FE4]"
                        />
                      </td>
                      {/* live lineTotal */}
                      <td className="px-4 py-2 text-right font-bold tabular-nums font-mono text-[#7B3FE4]">
                        {money.format(draftLineTotal)}
                      </td>
                      {/* recommendation — static */}
                      <td className="max-w-xs px-4 py-2 text-left text-xs leading-relaxed text-[#8B8B99]">
                        {sanitizePlainText(row.proRecommendation).trim() || "—"}
                      </td>
                      {/* confirm / cancel */}
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={commitEdit}
                            title="Confirm edit"
                            className="inline-flex items-center justify-center border border-[#7B3FE4] bg-[#7B3FE4] p-1 text-white transition hover:bg-[#6930cc] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#7B3FE4]"
                          >
                            <Check className="size-3" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            title="Cancel edit"
                            className="inline-flex items-center justify-center border border-[#3A3A44] bg-transparent p-1 text-[#8B8B99] transition hover:border-[#8B8B99] hover:text-[#E4E4F0] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#8B8B99]"
                          >
                            <X className="size-3" aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={`${row.description}-${i}`} className={`group ${base}`}>
                    {/* description */}
                    <td className="max-w-[280px] px-4 py-3 font-medium text-[#E4E4F0]">
                      {sanitizePlainText(row.description)}
                    </td>
                    {/* quantity + estimated badge */}
                    <td className="px-4 py-3 text-right tabular-nums font-mono text-[#E4E4F0]">
                      <div className="flex items-center justify-end gap-2">
                        {row.isEstimated === true && (
                          <>
                            <span className="inline-flex items-center border border-amber-600 bg-amber-950 px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-amber-400 uppercase font-mono">
                              Estimated
                            </span>
                            <button
                              type="button"
                              onClick={() => confirmEstimate(i)}
                              title="Confirm this labor estimate"
                              className="inline-flex items-center justify-center border border-amber-700 bg-amber-950 p-0.5 text-amber-400 transition hover:bg-amber-900 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
                            >
                              <Check className="size-3" aria-hidden />
                            </button>
                          </>
                        )}
                        {row.quantity}
                      </div>
                    </td>
                    {/* unit */}
                    <td className="px-4 py-3 text-[#B0B0BE]">
                      {sanitizePlainText(row.unit)}
                    </td>
                    {/* unitPrice */}
                    <td className="px-4 py-3 text-right tabular-nums font-mono text-[#E4E4F0]">
                      {money.format(row.unitPrice)}
                    </td>
                    {/* lineTotal */}
                    <td className="px-4 py-3 text-right font-bold tabular-nums font-mono text-[#E4E4F0]">
                      {money.format(row.lineTotal)}
                    </td>
                    {/* recommendation */}
                    <td className="max-w-xs px-4 py-3 text-left text-xs leading-relaxed text-[#8B8B99]">
                      {sanitizePlainText(row.proRecommendation).trim() || "—"}
                    </td>
                    {/* hover edit icon */}
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        onClick={() => startEdit(i)}
                        title="Edit row"
                        disabled={editingIndex !== null}
                        className="inline-flex items-center justify-center p-1 text-[#8B8B99] opacity-0 transition group-hover:opacity-100 hover:text-[#7B3FE4] focus:outline-none focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-[#7B3FE4] disabled:pointer-events-none"
                      >
                        <Pencil style={{ width: 14, height: 14 }} aria-hidden />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#7B3FE4] bg-[#0E0E11]">
              <td colSpan={7} className="px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
                  <span className="text-xs font-bold tracking-[0.2em] text-[#8B8B99] uppercase font-mono sm:mr-auto">
                    Total Estimate
                  </span>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xl font-bold tabular-nums font-mono text-[#7B3FE4]">
                      {money.format(grandTotal)}
                    </span>
                    <button
                      type="button"
                      onClick={() => downloadEstimatePdf({ lineItems, total: grandTotal, notes }, { companyName })}
                      className="inline-flex items-center gap-2 border border-[#22222A] bg-[#151518] px-3 py-2 text-xs font-bold tracking-[0.1em] text-[#E4E4F0] uppercase transition hover:border-[#7B3FE4] hover:text-[#7B3FE4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B3FE4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E0E11]"
                    >
                      <Download className="size-3.5 shrink-0" aria-hidden />
                      Export PDF
                    </button>
                    {transcript && !saved && (
                      <button
                        type="button"
                        onClick={() => void handleSave()}
                        disabled={isSaving}
                        className="inline-flex items-center gap-2 border border-[#7B3FE4] bg-[#7B3FE4] px-3 py-2 text-xs font-bold tracking-[0.1em] text-white uppercase transition hover:bg-[#6930cc] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B3FE4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E0E11] disabled:opacity-50"
                      >
                        <Save className="size-3.5 shrink-0" aria-hidden />
                        {isSaving ? "Saving…" : "Save"}
                      </button>
                    )}
                    {transcript && saved && (
                      <span className="text-xs font-bold tracking-[0.1em] text-[#7B3FE4] uppercase font-mono">
                        ✓ Saved
                      </span>
                    )}
                    {onDeleted && (
                      <button
                        type="button"
                        onClick={onDeleted}
                        className="inline-flex items-center gap-2 border border-red-800 bg-[#151518] px-3 py-2 text-xs font-bold tracking-[0.1em] text-red-400 uppercase transition hover:bg-red-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E0E11]"
                      >
                        <Trash2 className="size-3.5 shrink-0" aria-hidden />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                {transcript && !saved && hasEstimated && (
                  <p className="mt-2 text-right text-xs text-amber-400 font-mono">
                    ⚠ Review estimated items before saving
                  </p>
                )}
                {saveError && (
                  <p className="mt-2 text-right text-xs text-red-400 font-mono">
                    {saveError}
                  </p>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {notes.trim() ? (
        <div className="whitespace-pre-wrap border-t border-[#22222A] bg-[#0E0E11] px-4 py-3 text-sm text-[#8B8B99]">
          <span className="text-[10px] font-bold tracking-[0.2em] text-[#8B8B99] uppercase font-mono">
            Notes —{" "}
          </span>
          {sanitizePlainText(notes, { preserveNewlines: true })}
        </div>
      ) : null}
    </div>
  );
}
