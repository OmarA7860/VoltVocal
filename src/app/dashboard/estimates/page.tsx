"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, Download, ListChecks, Mail, Search, Trash2, X } from "lucide-react";
import {
  deleteEstimateAction,
  getEstimatesAction,
  updateEstimateStatusAction,
} from "@/app/actions/estimate-actions";
import { downloadEstimatePdf } from "@/lib/estimate-pdf";
import { getContractorProfileAction } from "@/app/actions/settings-actions";
import type { ContractorProfile } from "@/app/actions/settings-actions";
import { EstimateTable } from "@/components/estimate-table";
import type { EstimateResult } from "@/types/estimate";

const money = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
});

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

const STATUS_ORDER = ["pending", "sent", "accepted", "declined"] as const;
type EstimateStatus = typeof STATUS_ORDER[number];

const STATUS_STYLES: Record<EstimateStatus, string> = {
  pending:  "text-amber-400 border-amber-700/50 bg-amber-950/40",
  sent:     "text-sky-400 border-sky-700/50 bg-sky-950/40",
  accepted: "text-[#4DB87B] border-[#3A8F5F]/40 bg-[#3A8F5F]/10",
  declined: "text-red-400 border-red-700/50 bg-red-950/40",
};

export default function EstimatesPage() {
  const [estimates, setEstimates] = useState<SavedEstimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ContractorProfile | null>(null);
  const [search, setSearch] = useState("");

  const fetchEstimates = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getEstimatesAction();
    setLoading(false);
    if (result.ok) setEstimates(result.estimates);
    else setError(result.error);
  }, []);

  useEffect(() => {
    void fetchEstimates();
    getContractorProfileAction()
      .then((res) => {
        if (res.ok && res.profile) setProfile(res.profile);
      })
      .catch(() => undefined);
  }, [fetchEstimates]);

  async function handleDelete(id: string) {
    const result = await deleteEstimateAction(id);
    if (result.ok) {
      setEstimates((prev) => prev.filter((e) => e.id !== id));
      if (expandedId === id) setExpandedId(null);
    } else {
      setError(result.error);
    }
  }

  function handleDownload(est: SavedEstimate) {
    const estimate: EstimateResult = {
      lineItems: est.line_items,
      total: est.total,
      notes: est.notes,
    };
    downloadEstimatePdf(estimate, {
      companyName: profile?.company_name,
      licenseNumber: profile?.license_number,
      phone: profile?.phone,
      email: profile?.email,
      clientName: est.client_name || undefined,
      clientAddress: est.client_address || undefined,
    });
  }

  async function handleStatusChange(id: string, current: string) {
    const idx = STATUS_ORDER.indexOf(current as EstimateStatus);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    const result = await updateEstimateStatusAction(id, next);
    if (result.ok) {
      setEstimates((prev) => prev.map((e) => e.id === id ? { ...e, status: next } : e));
    }
  }

  function handleEmail(est: SavedEstimate) {
    const totalWithHST = Math.round(est.total * 1.13 * 100) / 100;
    const hst = Math.round(est.total * 0.13 * 100) / 100;
    const date = new Date(est.created_at).toLocaleDateString("en-CA", { dateStyle: "long" });
    const company = profile?.company_name ?? "Your Contractor";

    const subject = encodeURIComponent(`Estimate from ${company} — ${date}`);

    const itemLines = est.line_items
      .map((i) => `  • ${i.description}: ${i.quantity} ${i.unit} × $${i.unitPrice.toFixed(2)} = $${i.lineTotal.toFixed(2)}`)
      .join("\n");

    const bodyParts = [
      `Hi,`,
      ``,
      `Please find your estimate below.`,
      ``,
      ...(est.client_name ? [`Client: ${est.client_name}${est.client_address ? ` — ${est.client_address}` : ""}`] : []),
      `Date: ${date}`,
      ``,
      `ITEMS`,
      `─────────────────────`,
      itemLines,
      ``,
      `Subtotal:  ${money.format(est.total)}`,
      `HST (13%): ${money.format(hst)}`,
      `Total:     ${money.format(totalWithHST)}`,
      ...(est.notes?.trim() ? [``, `Notes: ${est.notes}`] : []),
      ``,
      `─────────────────────`,
      company,
      ...(profile?.phone ? [profile.phone] : []),
      ...(profile?.email ? [profile.email] : []),
      ...(profile?.license_number ? [`Lic: ${profile.license_number}`] : []),
    ];

    window.open(`mailto:?subject=${subject}&body=${encodeURIComponent(bodyParts.join("\n"))}`);
  }

  const q = search.trim().toLowerCase();
  const filtered = q
    ? estimates.filter(
        (e) =>
          e.transcript.toLowerCase().includes(q) ||
          e.client_name.toLowerCase().includes(q)
      )
    : estimates;

  return (
    <div className="flex min-h-full flex-col bg-[#090D0B]">
      {/* Desktop header — hidden on mobile */}
      <header className="hidden md:flex sticky top-0 z-30 border-b border-[#1E3025] bg-[#090D0B]/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image
              src="/logo-mark.png"
              alt="VoltVocal"
              width={36}
              height={36}
              style={{ objectFit: "contain" }}
            />
            <div>
              <div className="text-sm font-bold tracking-widest text-[#E0EDE5] uppercase">
                VoltVocal
              </div>
              <div className="text-[9px] tracking-[0.18em] text-[#4A6857] uppercase">
                Field Estimating
              </div>
            </div>
          </Link>

          <nav className="ml-auto flex items-center gap-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold tracking-wider text-[#4A6857] uppercase transition-colors hover:bg-[#1E3025] hover:text-[#8AA895]"
            >
              Home
            </Link>
            <Link
              href="/dashboard/estimates"
              className="relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold tracking-wider text-[#4DB87B] uppercase transition-colors"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#4DB87B]" />
              Estimates
              <span className="absolute inset-0 rounded-md bg-[#3A8F5F]/10" />
            </Link>
            <Link
              href="/dashboard/prices"
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold tracking-wider text-[#4A6857] uppercase transition-colors hover:bg-[#1E3025] hover:text-[#8AA895]"
            >
              Prices
            </Link>
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold tracking-wider text-[#4A6857] uppercase transition-colors hover:bg-[#1E3025] hover:text-[#8AA895]"
            >
              Settings
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex w-full flex-1 flex-col">
        {/* Section heading + search */}
        <div className="border-b border-[#1E3025]">
          <div className="flex items-center gap-2 px-4 pt-4 pb-3">
            <span className="text-[11px] font-bold tracking-[0.2em] text-[#4A6857] uppercase">
              Saved Estimates
            </span>
            {estimates.length > 0 && (
              <span className="rounded-full border border-[#1E3025] bg-[#131E17] px-2 py-0.5 text-[10px] font-bold text-[#3A8F5F] font-mono">
                {q ? `${filtered.length} / ${estimates.length}` : estimates.length}
              </span>
            )}
          </div>
          {!loading && estimates.length > 0 && (
            <div className="relative px-4 pb-3">
              <Search className="pointer-events-none absolute left-7 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#4A6857]" />
              <input
                type="text"
                placeholder="Search estimates…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-[#1E3025] bg-[#0E1612] py-2.5 pl-8 pr-8 text-sm text-[#E0EDE5] placeholder-[#4A6857] outline-none transition-colors focus:border-[#3A8F5F] focus:ring-1 focus:ring-[#3A8F5F]/30"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-7 top-1/2 -translate-y-1/2 p-1 text-[#4A6857] hover:text-[#8AA895]"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mt-4 rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3">
            <p className="text-[10px] font-bold tracking-widest text-red-400 uppercase font-mono">
              Error
            </p>
            <p className="mt-1 text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 px-4 py-10">
            <span
              className="h-1.5 w-1.5 rounded-full bg-[#3A8F5F] animate-bounce"
              style={{ animationDelay: "0s" }}
            />
            <span
              className="h-1.5 w-1.5 rounded-full bg-[#3A8F5F] animate-bounce"
              style={{ animationDelay: "0.15s" }}
            />
            <span
              className="h-1.5 w-1.5 rounded-full bg-[#3A8F5F] animate-bounce"
              style={{ animationDelay: "0.3s" }}
            />
            <span className="text-xs text-[#4A6857] ml-1">Loading estimates…</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && estimates.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center py-20">
            <div className="h-12 w-12 rounded-full bg-[#131E17] flex items-center justify-center border border-[#1E3025]">
              <ListChecks className="h-6 w-6 text-[#4A6857]" />
            </div>
            <p className="text-sm text-[#4A6857]">No estimates yet.</p>
            <p className="text-xs text-[#2A4234]">
              Record your first job site walkthrough.
            </p>
          </div>
        )}

        {/* No search results */}
        {!loading && !error && q && filtered.length === 0 && estimates.length > 0 && (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <p className="text-sm text-[#4A6857]">No estimates match &ldquo;{search}&rdquo;</p>
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-xs text-[#3A8F5F] hover:text-[#4DB87B] transition-colors"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Estimates list */}
        {!loading &&
          filtered.map((est) => {
            const isExpanded = expandedId === est.id;
            const totalWithHST = Math.round(est.total * 1.13 * 100) / 100;
            const estimate: EstimateResult = {
              lineItems: est.line_items,
              total: est.total,
              notes: est.notes,
            };

            return (
              <div key={est.id} className="border-b border-white/[0.06]">
                {/* Card header row */}
                <div className="px-4 py-4 bg-[#090D0B]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#4A6857] font-mono mb-1">
                        {new Date(est.created_at).toLocaleString("en-CA", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                      {est.client_name && (
                        <p className="text-xs font-semibold text-[#4DB87B] mt-0.5">
                          {est.client_name}{est.client_address ? ` · ${est.client_address}` : ""}
                        </p>
                      )}
                      <p className="text-sm text-[#8AA895] leading-snug line-clamp-2">
                        {est.transcript}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-base font-bold font-mono tabular-nums text-[#4DB87B]">
                        {money.format(totalWithHST)}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleStatusChange(est.id, est.status)}
                        title="Tap to change status"
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase font-mono transition-all active:scale-95 ${STATUS_STYLES[est.status as EstimateStatus] ?? STATUS_STYLES.pending}`}
                      >
                        {est.status}
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : est.id)}
                        className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center text-[#4A6857] transition-colors hover:text-[#8AA895]"
                        aria-label={isExpanded ? "Collapse" : "Expand"}
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      type="button"
                      onClick={() => handleDownload(est)}
                      className="inline-flex min-h-[36px] items-center gap-1 text-[10px] text-[#4A6857] transition-colors hover:text-[#8AA895]"
                    >
                      <Download className="h-3 w-3" />
                      PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEmail(est)}
                      className="inline-flex min-h-[36px] items-center gap-1 text-[10px] text-[#4A6857] transition-colors hover:text-[#8AA895]"
                    >
                      <Mail className="h-3 w-3" />
                      Email
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(est.id)}
                      className="inline-flex min-h-[36px] items-center gap-1 text-[10px] text-red-400 transition-colors hover:text-red-300"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-0 pb-2">
                    <EstimateTable
                      estimate={estimate}
                      transcript={est.transcript}
                      onDeleted={() => void handleDelete(est.id)}
                    />
                  </div>
                )}
              </div>
            );
          })}
      </main>
    </div>
  );
}
