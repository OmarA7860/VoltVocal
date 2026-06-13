"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, Settings } from "lucide-react";
import {
  getContractorProfileAction,
  saveContractorProfileAction,
} from "@/app/actions/settings-actions";
import type { ContractorProfile } from "@/app/actions/settings-actions";

const EMPTY: ContractorProfile = {
  company_name: "",
  license_number: "",
  phone: "",
  email: "",
};

const inputCls =
  "w-full rounded-xl border border-[#1E3025] bg-[#090D0B] px-3.5 py-2.5 text-sm text-[#E0EDE5] placeholder-[#2A4234] outline-none transition-all focus:border-[#3A8F5F] focus:ring-2 focus:ring-[#3A8F5F]/20";

export default function SettingsPage() {
  const [form, setForm] = useState<ContractorProfile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getContractorProfileAction();
    setLoading(false);
    if (res.ok && res.profile) {
      setForm(res.profile);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    const res = await saveContractorProfileAction(form);
    setSaving(false);
    if (res.ok) setSaved(true);
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
              Estimates
            </Link>
            <Link
              href="/dashboard/prices"
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold tracking-wider text-[#4A6857] uppercase transition-colors hover:bg-[#1E3025] hover:text-[#8AA895]"
            >
              Prices
            </Link>
            <Link
              href="/dashboard/settings"
              className="relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold tracking-wider text-[#4DB87B] uppercase transition-colors"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#4DB87B]" />
              Settings
              <span className="absolute inset-0 rounded-md bg-[#3A8F5F]/10" />
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-10 sm:px-6 gap-8">
        {/* Page hero */}
        <div className="animate-fade-up">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#2A4234] to-transparent" />
            <span className="text-[10px] font-bold tracking-[0.3em] text-[#4A6857] uppercase">
              Contractor Profile
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#2A4234] to-transparent" />
          </div>
          <h1 className="text-center text-2xl font-bold tracking-tight text-[#E0EDE5] sm:text-3xl">
            Your <span className="text-[#4DB87B]">Settings</span>
          </h1>
          <p className="mt-2 text-center text-sm text-[#4A6857] max-w-md mx-auto">
            Company info saved here appears in the header of every exported PDF
            estimate.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="animate-fade-up rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3">
            <p className="text-[10px] font-bold tracking-widest text-red-400 uppercase font-mono">
              Error
            </p>
            <p className="mt-1 text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="animate-fade-up rounded-2xl border border-[#1E3025] bg-[#0E1612] shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden">
          <div className="flex items-center gap-2.5 border-b border-[#1E3025] bg-[#0B1210]/60 px-5 py-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#3A8F5F]/15">
              <Settings className="h-3.5 w-3.5 text-[#4DB87B]" />
            </div>
            <span className="text-xs font-bold tracking-[0.2em] text-[#4A6857] uppercase">
              Contractor Info
            </span>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 px-5 py-8">
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
              <span className="text-xs text-[#4A6857] ml-1">Loading…</span>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold tracking-[0.15em] text-[#4A6857] uppercase">
                    Company Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bright Spark Electric Ltd."
                    value={form.company_name}
                    maxLength={120}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, company_name: e.target.value }))
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold tracking-[0.15em] text-[#4A6857] uppercase">
                    ECRA/ESA License Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 7012345"
                    value={form.license_number}
                    maxLength={60}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        license_number: e.target.value,
                      }))
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold tracking-[0.15em] text-[#4A6857] uppercase">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. (416) 555-0100"
                    value={form.phone}
                    maxLength={40}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold tracking-[0.15em] text-[#4A6857] uppercase">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. quotes@brightsparkelectric.ca"
                    value={form.email}
                    maxLength={120}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-3">
                {saved && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[#4DB87B] font-mono">
                    <Check className="h-3.5 w-3.5" />
                    Saved
                  </span>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#3A8F5F] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_12px_rgba(58,143,95,0.3)] transition-all hover:bg-[#2E7049] hover:shadow-[0_4px_16px_rgba(58,143,95,0.4)] active:scale-95 focus:outline-none disabled:opacity-50"
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  {saving ? "Saving…" : "Save Settings"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
