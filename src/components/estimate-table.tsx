"use client";

import { Download } from "lucide-react";
import { downloadEstimatePdf } from "@/lib/estimate-pdf";
import { sanitizePlainText } from "@/lib/sanitize-ai-text";
import type { EstimateResult } from "@/types/estimate";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type Props = {
  estimate: EstimateResult;
  /** Shown in the PDF header; falls back to NEXT_PUBLIC_COMPANY_NAME or "JobSite Estimate". */
  companyName?: string;
};

export function EstimateTable({ estimate, companyName }: Props) {
  const { lineItems, total, notes } = estimate;

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/80">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-200">
          Estimate summary
        </h3>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Line items from your voice note, with Expert Mode code- and
          safety-informed recommendations per line.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/80 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3 text-right">Unit price</th>
              <th className="px-4 py-3 text-right">Line total</th>
              <th className="min-w-[220px] px-4 py-3 normal-case">
                Recommendations
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {lineItems.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400"
                >
                  No line items returned. Try adding more detail in your voice
                  note.
                </td>
              </tr>
            ) : (
              lineItems.map((row, i) => (
                <tr
                  key={`${row.description}-${i}`}
                  className="bg-white hover:bg-zinc-50/80 dark:bg-zinc-950 dark:hover:bg-zinc-900/40"
                >
                  <td className="max-w-[280px] px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                    {sanitizePlainText(row.description)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-800 dark:text-zinc-200">
                    {row.quantity}
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {sanitizePlainText(row.unit)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-800 dark:text-zinc-200">
                    {money.format(row.unitPrice)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                    {money.format(row.lineTotal)}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-left text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {sanitizePlainText(row.proRecommendation).trim() || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60">
              <td colSpan={6} className="px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-6">
                  <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 sm:mr-auto">
                    Total estimate
                  </span>
                  <div className="flex flex-col items-end gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <span className="text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                      {money.format(total)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        downloadEstimatePdf(estimate, { companyName })
                      }
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus-visible:ring-offset-zinc-950"
                    >
                      <Download className="size-4 shrink-0" aria-hidden />
                      Download PDF
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {notes.trim() ? (
        <div className="whitespace-pre-wrap border-t border-zinc-200 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            Notes:{" "}
          </span>
          {sanitizePlainText(notes, { preserveNewlines: true })}
        </div>
      ) : null}
    </div>
  );
}
