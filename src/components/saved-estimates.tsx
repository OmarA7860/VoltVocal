"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteEstimateAction,
  getEstimatesAction,
} from "@/app/actions/estimate-actions";
import { EstimateTable } from "@/components/estimate-table";
import type { EstimateResult } from "@/types/estimate";

type SavedEstimate = {
  id: string;
  created_at: string;
  total: number;
  notes: string;
  transcript: string;
  line_items: EstimateResult["lineItems"];
};

export function SavedEstimates() {
  const [estimates, setEstimates] = useState<SavedEstimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEstimates = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getEstimatesAction();
    setLoading(false);
    if (result.ok) setEstimates(result.estimates);
    else setError(result.error);
  }, []);

  useEffect(() => { void fetchEstimates(); }, [fetchEstimates]);

  async function handleDelete(id: string) {
    const result = await deleteEstimateAction(id);
    if (result.ok) setEstimates((prev) => prev.filter((e) => e.id !== id));
    else setError(result.error);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <span className="h-1.5 w-1.5 rounded-full bg-[#3A8F5F] animate-bounce" style={{ animationDelay: "0s" }} />
        <span className="h-1.5 w-1.5 rounded-full bg-[#3A8F5F] animate-bounce" style={{ animationDelay: "0.15s" }} />
        <span className="h-1.5 w-1.5 rounded-full bg-[#3A8F5F] animate-bounce" style={{ animationDelay: "0.3s" }} />
        <span className="text-xs text-[#4A6857] ml-1">Loading estimates…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3">
        <p className="text-[10px] font-bold tracking-widest text-red-400 uppercase font-mono">Error</p>
        <p className="mt-1 text-sm text-red-300">{error}</p>
      </div>
    );
  }

  if (estimates.length === 0) return null;

  return (
    <section className="w-full space-y-8">
      {/* Section heading */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#1E3025] to-transparent" />
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold tracking-[0.3em] text-[#4A6857] uppercase">
            Saved Estimates
          </span>
          <span className="rounded-full bg-[#131E17] px-2 py-0.5 text-[10px] font-bold text-[#3A8F5F] font-mono border border-[#1E3025]">
            {estimates.length}
          </span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#1E3025] to-transparent" />
      </div>

      {estimates.map((est) => {
        const estimate: EstimateResult = {
          lineItems: est.line_items,
          total: est.total,
          notes: est.notes,
        };
        return (
          <div key={est.id} className="animate-fade-up space-y-2">
            <div className="flex items-center gap-3 px-1">
              <span className="h-px flex-1 bg-[#1A2820]" />
              <time className="text-[10px] font-mono tracking-widest text-[#4A6857] uppercase">
                {new Date(est.created_at).toLocaleString("en-CA", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </time>
              <span className="h-px flex-1 bg-[#1A2820]" />
            </div>
            <EstimateTable
              estimate={estimate}
              transcript={est.transcript}
              onDeleted={() => void handleDelete(est.id)}
            />
          </div>
        );
      })}
    </section>
  );
}
