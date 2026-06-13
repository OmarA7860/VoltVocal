"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, Pencil, Plus, Tag, Trash2, X } from "lucide-react";
import {
  deletePriceItemAction,
  getPriceListAction,
  savePriceItemAction,
  updatePriceItemAction,
} from "@/app/actions/price-actions";
import type { PriceItem } from "@/types/price";

const CATEGORIES = ["general", "receptacles", "cable", "labor", "misc"] as const;

const CATEGORY_COLORS: Record<string, string> = {
  receptacles: "text-sky-400 bg-sky-950/40 border-sky-800/50",
  cable:       "text-amber-400 bg-amber-950/40 border-amber-800/50",
  labor:       "text-[#4DB87B] bg-[#3A8F5F]/10 border-[#3A8F5F]/30",
  misc:        "text-slate-400 bg-slate-900/40 border-slate-700/50",
  general:     "text-[#8AA895] bg-[#131E17] border-[#2A4234]",
};

const money = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
});

type FormState = { name: string; unit: string; unit_price: string; category: string };
const EMPTY_FORM: FormState = { name: "", unit: "each", unit_price: "", category: "general" };

const inputCls = "w-full rounded-xl border border-[#1E3025] bg-[#090D0B] px-3.5 py-2.5 text-sm text-[#E0EDE5] placeholder-[#2A4234] outline-none transition-all focus:border-[#3A8F5F] focus:ring-2 focus:ring-[#3A8F5F]/20";
const inlineInputCls = "rounded-lg border border-[#1E3025] bg-[#090D0B] px-2 py-1.5 text-sm text-[#E0EDE5] outline-none transition-colors focus:border-[#3A8F5F] focus:ring-1 focus:ring-[#3A8F5F]/30";

export default function PricesPage() {
  const [items, setItems] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getPriceListAction();
    setLoading(false);
    if (res.ok) setItems(res.items);
    else setError(res.error);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const price = parseFloat(form.unit_price);
    if (!form.name.trim()) return;
    if (!Number.isFinite(price) || price < 0) { setError("Enter a valid price (0 or greater)."); return; }
    setSubmitting(true);
    setError(null);
    const res = await savePriceItemAction({ name: form.name, unit: form.unit || "each", unit_price: price, category: form.category });
    setSubmitting(false);
    if (res.ok) { setItems((prev) => [res.item, ...prev]); setForm(EMPTY_FORM); }
    else setError(res.error);
  }

  async function handleDelete(id: string) {
    setError(null);
    const res = await deletePriceItemAction(id);
    if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
    else setError(res.error);
  }

  function startEdit(item: PriceItem) {
    setEditingId(item.id);
    setEditDraft({ name: item.name, unit: item.unit, unit_price: String(item.unit_price), category: item.category });
  }

  function cancelEdit() { setEditingId(null); setEditDraft(null); }

  async function commitEdit() {
    if (!editingId || !editDraft) return;
    const price = parseFloat(editDraft.unit_price);
    if (!editDraft.name.trim() || !Number.isFinite(price) || price < 0) { setError("Enter a valid name and price."); return; }
    setSaving(true);
    setError(null);
    const res = await updatePriceItemAction(editingId, { name: editDraft.name, unit: editDraft.unit || "each", unit_price: price, category: editDraft.category });
    setSaving(false);
    if (res.ok) { setItems((prev) => prev.map((i) => (i.id === editingId ? res.item : i))); setEditingId(null); setEditDraft(null); }
    else setError(res.error);
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#090D0B]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#1E3025] bg-[#090D0B]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="VoltVocal"
              width={44}
              height={44}
              style={{ objectFit: 'contain' }}
            />
            <div>
              <div className="text-sm font-bold tracking-widest text-[#E0EDE5] uppercase">VoltVocal</div>
              <div className="text-[9px] tracking-[0.18em] text-[#4A6857] uppercase">Field Estimating</div>
            </div>
          </Link>

          <nav className="ml-auto flex items-center gap-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold tracking-wider text-[#4A6857] uppercase transition-colors hover:bg-[#1E3025] hover:text-[#8AA895]"
            >
              Estimates
            </Link>
            <Link
              href="/dashboard/prices"
              className="relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold tracking-wider text-[#4DB87B] uppercase transition-colors"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#4DB87B]" />
              Prices
              <span className="absolute inset-0 rounded-md bg-[#3A8F5F]/10" />
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

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-10 sm:px-6 gap-8">
        {/* Page hero */}
        <div className="animate-fade-up">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#2A4234] to-transparent" />
            <span className="text-[10px] font-bold tracking-[0.3em] text-[#4A6857] uppercase">Price List</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#2A4234] to-transparent" />
          </div>
          <h1 className="text-center text-2xl font-bold tracking-tight text-[#E0EDE5] sm:text-3xl">
            Your Items &amp; <span className="text-[#4DB87B]">Rates</span>
          </h1>
          <p className="mt-2 text-center text-sm text-[#4A6857] max-w-md mx-auto">
            Prices saved here are injected into every AI estimate. When a spoken item matches,
            your exact price is used automatically.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="animate-fade-up rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3">
            <p className="text-[10px] font-bold tracking-widest text-red-400 uppercase font-mono">Error</p>
            <p className="mt-1 text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Add form */}
        <div className="animate-fade-up rounded-2xl border border-[#1E3025] bg-[#0E1612] shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden">
          <div className="flex items-center gap-2.5 border-b border-[#1E3025] bg-[#0B1210]/60 px-5 py-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#3A8F5F]/15">
              <Plus className="h-3.5 w-3.5 text-[#4DB87B]" />
            </div>
            <span className="text-xs font-bold tracking-[0.2em] text-[#4A6857] uppercase">Add New Item</span>
          </div>

          <form onSubmit={(e) => void handleAdd(e)} className="p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px_140px_160px] mb-3">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold tracking-[0.15em] text-[#4A6857] uppercase">Item Name</label>
                <input
                  type="text"
                  placeholder="e.g. 20A Tamper-Resistant Receptacle"
                  value={form.name}
                  maxLength={200}
                  required
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-bold tracking-[0.15em] text-[#4A6857] uppercase">Unit</label>
                <input
                  type="text"
                  placeholder="each"
                  value={form.unit}
                  maxLength={50}
                  required
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-bold tracking-[0.15em] text-[#4A6857] uppercase">Unit Price ($)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={form.unit_price}
                  min="0" max="99999" step="0.01"
                  required
                  onChange={(e) => setForm((f) => ({ ...f, unit_price: e.target.value }))}
                  className={`${inputCls} text-right font-mono`}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-bold tracking-[0.15em] text-[#4A6857] uppercase">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className={`${inputCls} capitalize`}
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-[#3A8F5F] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_12px_rgba(58,143,95,0.3)] transition-all hover:bg-[#2E7049] hover:shadow-[0_4px_16px_rgba(58,143,95,0.4)] active:scale-95 focus:outline-none disabled:opacity-50"
              >
                <Plus className="h-4 w-4 shrink-0" />
                {submitting ? "Adding…" : "Add to Price List"}
              </button>
            </div>
          </form>
        </div>

        {/* Items table */}
        <div className="animate-fade-up rounded-2xl border border-[#1E3025] bg-[#0E1612] shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#1E3025] bg-[#0B1210]/60 px-5 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#3A8F5F]/15">
                <Tag className="h-3.5 w-3.5 text-[#4DB87B]" />
              </div>
              <span className="text-xs font-bold tracking-[0.2em] text-[#4A6857] uppercase">Saved Items</span>
            </div>
            {items.length > 0 && (
              <span className="rounded-full border border-[#1E3025] bg-[#131E17] px-2.5 py-0.5 text-[10px] font-bold text-[#3A8F5F] font-mono">
                {items.length}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center gap-2 px-5 py-8">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3A8F5F] animate-bounce" style={{ animationDelay: "0s" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-[#3A8F5F] animate-bounce" style={{ animationDelay: "0.15s" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-[#3A8F5F] animate-bounce" style={{ animationDelay: "0.3s" }} />
              <span className="text-xs text-[#4A6857] ml-1">Loading…</span>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#131E17] ring-1 ring-[#1E3025]">
                <Tag className="h-6 w-6 text-[#2A4234]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#4A6857]">No items yet</p>
                <p className="mt-1 text-xs text-[#2A4234]">Add your first item using the form above</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[580px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#1E3025] bg-[#0B1210]/40 text-[10px] font-bold tracking-[0.2em] uppercase text-[#4A6857] font-mono">
                    <th className="px-5 py-3">Item Name</th>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3 text-right">Unit Price</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="w-20 px-4 py-3" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => {
                    const isEven = i % 2 === 0;
                    const isEditing = editingId === item.id;
                    const catColor = CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.general;

                    if (isEditing && editDraft) {
                      return (
                        <tr key={item.id} className="bg-[#3A8F5F]/8 ring-1 ring-inset ring-[#3A8F5F]/40 border-b border-[#1A2820]">
                          <td className="px-5 py-2.5">
                            <input type="text" value={editDraft.name} maxLength={200} autoFocus
                              onChange={(e) => setEditDraft((d) => d && { ...d, name: e.target.value })}
                              className={`w-full ${inlineInputCls}`} />
                          </td>
                          <td className="px-4 py-2.5">
                            <input type="text" value={editDraft.unit} maxLength={50}
                              onChange={(e) => setEditDraft((d) => d && { ...d, unit: e.target.value })}
                              className={`w-24 ${inlineInputCls}`} />
                          </td>
                          <td className="px-4 py-2.5">
                            <input type="number" inputMode="decimal" value={editDraft.unit_price} min="0" max="99999" step="0.01"
                              onChange={(e) => setEditDraft((d) => d && { ...d, unit_price: e.target.value })}
                              className={`w-32 text-right font-mono ${inlineInputCls}`} />
                          </td>
                          <td className="px-4 py-2.5">
                            <select value={editDraft.category}
                              onChange={(e) => setEditDraft((d) => d && { ...d, category: e.target.value })}
                              className={`capitalize ${inlineInputCls}`}>
                              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1">
                              <button type="button" onClick={() => void commitEdit()} disabled={saving} title="Save"
                                className="inline-flex items-center justify-center rounded-md bg-[#3A8F5F] p-1.5 text-white transition-all hover:bg-[#2E7049] disabled:opacity-50">
                                <Check className="h-3 w-3" />
                              </button>
                              <button type="button" onClick={cancelEdit} title="Cancel"
                                className="inline-flex items-center justify-center rounded-md border border-[#2A4234] p-1.5 text-[#8AA895] transition-all hover:border-[#4A6857] hover:text-[#E0EDE5]">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={item.id}
                        className={`group border-b border-[#1A2820] transition-colors hover:bg-[#131E17] ${isEven ? "bg-[#0E1612]" : "bg-[#0B1210]/50"}`}>
                        <td className="px-5 py-3.5 font-medium text-[#E0EDE5]">{item.name}</td>
                        <td className="px-4 py-3.5 text-[#8AA895]">{item.unit}</td>
                        <td className="px-4 py-3.5 text-right tabular-nums font-mono font-semibold text-[#E0EDE5]">
                          {money.format(item.unit_price)}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase font-mono ${catColor}`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
                            <button type="button" onClick={() => startEdit(item)} disabled={editingId !== null} title="Edit"
                              className="inline-flex items-center justify-center rounded-md p-1.5 text-[#4A6857] transition-all hover:bg-[#1E3025] hover:text-[#4DB87B] focus:outline-none disabled:pointer-events-none">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" onClick={() => void handleDelete(item.id)} title="Delete"
                              className="inline-flex items-center justify-center rounded-md p-1.5 text-[#4A6857] transition-all hover:bg-red-950/40 hover:text-red-400 focus:outline-none">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
