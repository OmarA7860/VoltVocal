"use client";

import { useEffect, useState } from "react";
import { Check, Download, Pencil, Save, Trash2, X } from "lucide-react";
import { downloadEstimatePdf } from "@/lib/estimate-pdf";
import { saveEstimateAction } from "@/app/actions/estimate-actions";
import { getContractorProfileAction } from "@/app/actions/settings-actions";
import type { ContractorProfile } from "@/app/actions/settings-actions";
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

const DESC_MAX       = 300;
const QTY_MIN        = 0.5;
const QTY_MAX        = 9999;
const PRICE_MIN      = 0;
const PRICE_MAX      = 99999;
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
  const [lineItems, setLineItems]         = useState<EstimateLineItem[]>(estimate.lineItems);
  const [editingIndex, setEditingIndex]   = useState<number | null>(null);
  const [draft, setDraft]                 = useState<Draft | null>(null);
  const [isSaving, setIsSaving]           = useState(false);
  const [saveError, setSaveError]         = useState<string | null>(null);
  const [saved, setSaved]                 = useState(false);
  const [contractorProfile, setContractorProfile] = useState<ContractorProfile | null>(null);

  useEffect(() => {
    getContractorProfileAction().then((res) => {
      if (res.ok && res.profile) setContractorProfile(res.profile);
    }).catch(() => undefined);
  }, []);

  const subtotal   = lineItems.reduce((s, r) => s + r.lineTotal, 0);
  const hst        = Math.round(subtotal * 0.13 * 100) / 100;
  const grandTotal = Math.round((subtotal + hst) * 100) / 100;
  const hasEstimated = lineItems.some((r) => r.isEstimated === true);

  function startEdit(i: number) {
    const row = lineItems[i];
    setEditingIndex(i);
    setDraft({ description: row.description, rawQty: String(row.quantity), rawPrice: String(row.unitPrice) });
  }

  function cancelEdit() { setEditingIndex(null); setDraft(null); }

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
    const origRow   = lineItems[editingIndex];
    const safeDesc  = sanitizeUserEditedText(draft.description, DESC_MAX);
    const safeQty   = parseQty(draft.rawQty, origRow.quantity);
    const safePrice = parsePrice(draft.rawPrice, origRow.unitPrice);
    const safeTotal = sanitizeNumericInput(safeQty * safePrice, 0, LINE_TOTAL_MAX, 0);
    setLineItems((prev) =>
      prev.map((row, i) =>
        i === editingIndex
          ? { ...row, description: safeDesc || row.description, quantity: safeQty, unitPrice: safePrice, lineTotal: safeTotal }
          : row,
      ),
    );
    setEditingIndex(null);
    setDraft(null);
  }

  function confirmEstimate(index: number) {
    setLineItems((prev) => prev.map((row, i) => (i === index ? { ...row, isEstimated: false } : row)));
  }

  async function handleSave() {
    if (!transcript) return;
    setIsSaving(true);
    setSaveError(null);
    const currentEstimate: EstimateResult = { lineItems, total: subtotal, notes };
    const result = await saveEstimateAction(transcript, currentEstimate);
    setIsSaving(false);
    if (result.ok) setSaved(true);
    else setSaveError(result.error);
  }

  const draftLineTotal = (() => {
    if (draft === null || editingIndex === null) return 0;
    const q = parseFloat(draft.rawQty);
    const p = parseFloat(draft.rawPrice);
    if (Number.isFinite(q) && q > 0 && Number.isFinite(p) && p >= 0)
      return sanitizeNumericInput(q * p, 0, LINE_TOTAL_MAX, 0);
    return lineItems[editingIndex]?.lineTotal ?? 0;
  })();

  const inputCls =
    "border border-[#1E3025] bg-[#090D0B] px-2 py-1.5 text-sm text-[#E0EDE5] rounded-lg outline-none transition-colors focus:border-[#3A8F5F] focus:ring-1 focus:ring-[#3A8F5F]/30";

  // ── Totals + action buttons footer (shared between mobile and desktop) ──────
  const totalsAndActions = (
    <div className="border-t-2 border-[#3A8F5F]/40 bg-[#0B1210]/80 px-4 py-4 sm:px-5">
      {/* Subtotal / HST / Total */}
      <div className="mb-4 flex flex-col items-end gap-1">
        <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-end sm:gap-8">
          <span className="text-[11px] font-mono tracking-wider text-[#4A6857] uppercase">
            Subtotal
          </span>
          <span className="text-sm tabular-nums font-mono text-[#8AA895] sm:w-28 sm:text-right">
            {money.format(subtotal)}
          </span>
        </div>
        <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-end sm:gap-8">
          <span className="text-[11px] font-mono tracking-wider text-[#2A4234] uppercase">
            HST (13%)
          </span>
          <span className="text-sm tabular-nums font-mono text-[#4A6857] sm:w-28 sm:text-right">
            {money.format(hst)}
          </span>
        </div>
        <div className="mt-1 flex w-full items-center justify-between gap-4 border-t border-[#1E3025] pt-2 sm:w-auto sm:justify-end sm:gap-8">
          <span className="text-[11px] font-bold font-mono tracking-wider text-[#8AA895] uppercase">
            Total
          </span>
          <span className="text-2xl font-bold tabular-nums font-mono text-[#A78BFA] sm:w-28 sm:text-right">
            {money.format(grandTotal)}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2.5">
        <button
          type="button"
          onClick={() =>
            downloadEstimatePdf(
              { lineItems, total: subtotal, notes },
              {
                companyName: contractorProfile?.company_name ?? companyName,
                licenseNumber: contractorProfile?.license_number,
                phone: contractorProfile?.phone,
                email: contractorProfile?.email,
              },
            )
          }
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-[#2A4234] bg-[#131E17] px-3.5 py-2 text-xs font-semibold tracking-wide text-[#8AA895] transition-all hover:border-[#3A8F5F] hover:text-[#4DB87B] focus:outline-none active:scale-[0.97] sm:w-auto sm:min-h-0"
        >
          <Download className="h-3.5 w-3.5 shrink-0" />
          Export PDF
        </button>

        {transcript && !saved && (
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#3A8F5F] px-3.5 py-2 text-xs font-semibold tracking-wide text-white transition-all hover:bg-[#2E7049] active:scale-[0.97] focus:outline-none disabled:opacity-50 sm:w-auto sm:min-h-0"
          >
            <Save className="h-3.5 w-3.5 shrink-0" />
            {isSaving ? "Saving…" : "Save Estimate"}
          </button>
        )}

        {transcript && saved && (
          <span className="flex items-center justify-center gap-1.5 text-xs font-semibold tracking-wide text-[#4DB87B] font-mono">
            <Check className="h-3.5 w-3.5" />
            Saved
          </span>
        )}

        {onDeleted && (
          <button
            type="button"
            onClick={onDeleted}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-red-900/50 bg-red-950/20 px-3.5 py-2 text-xs font-semibold tracking-wide text-red-400 transition-all hover:bg-red-950/40 hover:border-red-700/60 active:scale-[0.97] focus:outline-none sm:w-auto sm:min-h-0"
          >
            <Trash2 className="h-3.5 w-3.5 shrink-0" />
            Delete
          </button>
        )}
      </div>

      {transcript && !saved && hasEstimated && (
        <p className="mt-2 text-right text-xs text-amber-400/80 font-mono">
          ⚠ Review estimated labor hours before saving
        </p>
      )}
      {saveError && (
        <p className="mt-2 text-right text-xs text-red-400 font-mono">{saveError}</p>
      )}
    </div>
  );

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-[#1E3025] bg-[#0E1612] shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-[#1E3025] bg-[#0B1210]/80 px-4 py-3 sm:px-5">
        <span className="text-[10px] font-bold tracking-[0.25em] text-[#4A6857] uppercase">
          Estimate Output
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-[#4DB87B] uppercase font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-[#4DB87B]" />
          Ready
        </span>
      </div>

      {/* ── MOBILE CARD LIST (visible below md) ─────────────────────────────── */}
      <div className="md:hidden">
        {lineItems.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-[#4A6857]">
            No line items returned. Try adding more detail in your recording.
          </div>
        ) : (
          lineItems.map((row, i) => {
            const isEditing = editingIndex === i;

            if (isEditing && draft !== null) {
              const descLen   = draft.description.length;
              const nearLimit = descLen > 250;
              return (
                <div
                  key={`mobile-edit-${i}`}
                  className="border-b border-[#1A2820] bg-[#3A8F5F]/5 px-4 py-4 ring-1 ring-inset ring-[#3A8F5F]/30"
                >
                  {/* Description input */}
                  <div className="mb-3 flex flex-col gap-0.5">
                    <label className="text-[9px] font-bold tracking-[0.2em] text-[#4A6857] uppercase font-mono">
                      Description
                    </label>
                    <input
                      type="text"
                      value={draft.description}
                      maxLength={DESC_MAX}
                      autoFocus
                      onChange={(e) => {
                        const safe = e.target.value
                          .replace(/<[^>]+>/g, "")
                          .replace(/javascript\s*:/gi, "")
                          .replace(/on\w+\s*=/gi, "")
                          .slice(0, DESC_MAX);
                        setDraft((d) => d && { ...d, description: safe });
                      }}
                      onBlur={(e) =>
                        setDraft((d) => d && { ...d, description: sanitizeUserEditedText(e.target.value, DESC_MAX) })
                      }
                      className={`w-full ${inputCls}`}
                    />
                    {nearLimit && (
                      <span className="text-[9px] font-mono text-amber-400">
                        {descLen}/{DESC_MAX}
                      </span>
                    )}
                  </div>

                  {/* Qty + Price row */}
                  <div className="mb-3 grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[9px] font-bold tracking-[0.2em] text-[#4A6857] uppercase font-mono">
                        Qty ({sanitizePlainText(row.unit)})
                      </label>
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
                        className={`w-full text-right ${inputCls}`}
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[9px] font-bold tracking-[0.2em] text-[#4A6857] uppercase font-mono">
                        Unit Price
                      </label>
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
                        className={`w-full text-right ${inputCls}`}
                      />
                    </div>
                  </div>

                  {/* Live total */}
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[9px] font-bold tracking-[0.2em] text-[#4A6857] uppercase font-mono">
                      Line Total
                    </span>
                    <span className="text-base font-bold tabular-nums font-mono text-[#4DB87B]">
                      {money.format(draftLineTotal)}
                    </span>
                  </div>

                  {/* Save / Cancel */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={commitEdit}
                      className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-[#3A8F5F] text-xs font-semibold text-white transition-all hover:bg-[#2E7049] focus:outline-none active:scale-[0.97]"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg border border-[#2A4234] text-xs font-semibold text-[#8AA895] transition-all hover:border-[#4A6857] hover:text-[#E0EDE5] focus:outline-none active:scale-[0.97]"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={`mobile-row-${i}`}
                className={`border-b border-[#1A2820] px-4 py-4 ${i % 2 === 0 ? "bg-[#0E1612]" : "bg-[#0B1210]/50"}`}
              >
                {/* Description + total */}
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-medium leading-snug text-[#E0EDE5]">
                    {sanitizePlainText(row.description)}
                  </span>
                  <span className="shrink-0 text-sm font-bold tabular-nums font-mono text-[#E0EDE5]">
                    {money.format(row.lineTotal)}
                  </span>
                </div>

                {/* Qty × price / unit */}
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[#4A6857]">
                  {row.isEstimated === true && (
                    <span className="inline-flex items-center rounded border border-amber-700/60 bg-amber-950/40 px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-amber-400 uppercase font-mono">
                      Est.
                    </span>
                  )}
                  <span>
                    {row.quantity} {sanitizePlainText(row.unit)} × {money.format(row.unitPrice)}
                  </span>
                </div>

                {/* Confirm estimated + recommendation */}
                {row.isEstimated === true && (
                  <button
                    type="button"
                    onClick={() => confirmEstimate(i)}
                    className="mt-2 inline-flex min-h-[36px] items-center gap-1.5 rounded border border-amber-700/50 bg-amber-950/40 px-2.5 py-1 text-[10px] font-semibold text-amber-400 transition hover:bg-amber-900/50"
                  >
                    <Check className="h-3 w-3" />
                    Confirm estimate
                  </button>
                )}

                {sanitizePlainText(row.proRecommendation).trim() && (
                  <p className="mt-1.5 text-xs leading-relaxed text-[#4A6857]">
                    {sanitizePlainText(row.proRecommendation)}
                  </p>
                )}

                {/* Edit button — always visible on mobile */}
                <button
                  type="button"
                  onClick={() => startEdit(i)}
                  disabled={editingIndex !== null}
                  className="mt-2 inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-[#1E3025] px-3 py-1 text-[10px] font-semibold tracking-wide text-[#4A6857] transition-all hover:border-[#2A4234] hover:text-[#8AA895] focus:outline-none disabled:pointer-events-none disabled:opacity-40"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
              </div>
            );
          })
        )}

        {totalsAndActions}
      </div>

      {/* ── DESKTOP TABLE (hidden below md) ─────────────────────────────────── */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#1E3025] bg-[#0B1210]/60 text-[10px] font-bold tracking-[0.2em] uppercase text-[#4A6857] font-mono">
                <th className="px-5 py-3">Description</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="min-w-[200px] px-4 py-3 normal-case tracking-normal font-sans font-medium text-[#4A6857]">
                  Recommendations
                </th>
                <th className="w-10 px-3 py-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {lineItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-[#4A6857]">
                    No line items returned. Try adding more detail in your recording.
                  </td>
                </tr>
              ) : (
                lineItems.map((row, i) => {
                  const isEditing = editingIndex === i;
                  const isEven    = i % 2 === 0;

                  if (isEditing && draft !== null) {
                    const descLen   = draft.description.length;
                    const nearLimit = descLen > 250;
                    return (
                      <tr
                        key={`desktop-edit-${i}`}
                        className="bg-[#3A8F5F]/8 ring-1 ring-inset ring-[#3A8F5F]/40"
                      >
                        <td className="px-5 py-2.5">
                          <div className="flex flex-col gap-0.5">
                            <input
                              type="text"
                              value={draft.description}
                              maxLength={DESC_MAX}
                              autoFocus
                              onChange={(e) => {
                                const safe = e.target.value
                                  .replace(/<[^>]+>/g, "")
                                  .replace(/javascript\s*:/gi, "")
                                  .replace(/on\w+\s*=/gi, "")
                                  .slice(0, DESC_MAX);
                                setDraft((d) => d && { ...d, description: safe });
                              }}
                              onBlur={(e) =>
                                setDraft((d) => d && { ...d, description: sanitizeUserEditedText(e.target.value, DESC_MAX) })
                              }
                              className={`w-full ${inputCls}`}
                            />
                            {nearLimit && (
                              <span className="text-[9px] font-mono text-amber-400">
                                {descLen}/{DESC_MAX}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
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
                            className={`w-20 text-right ${inputCls}`}
                          />
                        </td>
                        <td className="px-4 py-2.5 text-[#8AA895]">
                          {sanitizePlainText(row.unit)}
                        </td>
                        <td className="px-4 py-2.5">
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
                            className={`w-28 text-right ${inputCls}`}
                          />
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold tabular-nums font-mono text-[#4DB87B]">
                          {money.format(draftLineTotal)}
                        </td>
                        <td className="max-w-xs px-4 py-2.5 text-xs leading-relaxed text-[#4A6857]">
                          {sanitizePlainText(row.proRecommendation).trim() || "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={commitEdit}
                              title="Confirm"
                              className="inline-flex items-center justify-center rounded-md bg-[#3A8F5F] p-1.5 text-white transition-all hover:bg-[#2E7049] focus:outline-none"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              title="Cancel"
                              className="inline-flex items-center justify-center rounded-md border border-[#2A4234] p-1.5 text-[#8AA895] transition-all hover:border-[#4A6857] hover:text-[#E0EDE5] focus:outline-none"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={`desktop-row-${i}`}
                      className={`group border-b border-[#1A2820] transition-colors hover:bg-[#131E17] ${isEven ? "bg-[#0E1612]" : "bg-[#0B1210]/50"}`}
                    >
                      <td className="max-w-[260px] px-5 py-3.5 font-medium text-[#E0EDE5]">
                        {sanitizePlainText(row.description)}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums font-mono text-[#E0EDE5]">
                        <div className="flex items-center justify-end gap-2">
                          {row.isEstimated === true && (
                            <>
                              <span className="inline-flex items-center rounded border border-amber-700/60 bg-amber-950/40 px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-amber-400 uppercase font-mono">
                                Est.
                              </span>
                              <button
                                type="button"
                                onClick={() => confirmEstimate(i)}
                                title="Confirm"
                                className="inline-flex items-center justify-center rounded border border-amber-700/50 bg-amber-950/40 p-0.5 text-amber-400 transition hover:bg-amber-900/50"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                            </>
                          )}
                          {row.quantity}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[#8AA895]">
                        {sanitizePlainText(row.unit)}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums font-mono text-[#E0EDE5]">
                        {money.format(row.unitPrice)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold tabular-nums font-mono text-[#E0EDE5]">
                        {money.format(row.lineTotal)}
                      </td>
                      <td className="max-w-xs px-4 py-3.5 text-xs leading-relaxed text-[#4A6857]">
                        {sanitizePlainText(row.proRecommendation).trim() || (
                          <span className="text-[#2A4234]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5">
                        <button
                          type="button"
                          onClick={() => startEdit(i)}
                          title="Edit row"
                          disabled={editingIndex !== null}
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-[#4A6857] opacity-0 transition-all group-hover:opacity-100 hover:bg-[#1E3025] hover:text-[#4DB87B] focus:outline-none focus-visible:opacity-100 disabled:pointer-events-none"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={7} className="p-0">
                  {totalsAndActions}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {notes.trim() ? (
        <div className="border-t border-[#1E3025] bg-[#0B1210]/60 px-4 py-4 text-sm text-[#8AA895] whitespace-pre-wrap leading-relaxed sm:px-5">
          <span className="text-[10px] font-bold tracking-[0.2em] text-[#4A6857] uppercase font-mono">
            Notes —{" "}
          </span>
          {sanitizePlainText(notes, { preserveNewlines: true })}
        </div>
      ) : null}
    </div>
  );
}
