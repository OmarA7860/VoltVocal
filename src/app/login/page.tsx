"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { loginAction, signupAction } from "@/app/actions/auth-actions";
import type { AuthState } from "@/app/actions/auth-actions";

const inputCls =
  "w-full rounded-xl border border-[#1E3025] bg-[#090D0B] px-3.5 py-3 text-sm text-[#E0EDE5] placeholder-[#2A4234] outline-none transition-all focus:border-[#3A8F5F] focus:ring-2 focus:ring-[#3A8F5F]/20";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");

  const [loginState, loginDispatch, loginPending] = useActionState<AuthState, FormData>(
    loginAction,
    undefined,
  );
  const [signupState, signupDispatch, signupPending] = useActionState<AuthState, FormData>(
    signupAction,
    undefined,
  );

  const pending = loginPending || signupPending;
  const error = mode === "login" ? loginState?.error : signupState?.error;

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-[#090D0B] px-4 py-16">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <Image src="/logo.png" alt="VoltVocal" width={56} height={56} style={{ objectFit: "contain" }} />
          <div className="text-center">
            <div className="text-lg font-bold tracking-widest text-[#E0EDE5] uppercase">
              VoltVocal
            </div>
            <div className="text-[10px] tracking-[0.2em] text-[#4A6857] uppercase">
              Field Estimating
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#1E3025] bg-[#0E1612] shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
          {/* Tabs */}
          <div className="flex border-b border-[#1E3025]">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 py-3 text-xs font-bold tracking-[0.15em] uppercase transition-colors ${
                mode === "login"
                  ? "text-[#4DB87B] border-b-2 border-[#4DB87B] -mb-px"
                  : "text-[#4A6857] hover:text-[#8AA895]"
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 py-3 text-xs font-bold tracking-[0.15em] uppercase transition-colors ${
                mode === "signup"
                  ? "text-[#4DB87B] border-b-2 border-[#4DB87B] -mb-px"
                  : "text-[#4A6857] hover:text-[#8AA895]"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <div className="p-6">
            {mode === "login" ? (
              <form action={loginDispatch} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold tracking-[0.15em] text-[#4A6857] uppercase">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold tracking-[0.15em] text-[#4A6857] uppercase">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={inputCls}
                  />
                </div>
                {error && (
                  <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-400">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={pending}
                  className="mt-2 w-full rounded-xl bg-[#3A8F5F] py-3 text-sm font-semibold text-white shadow-[0_2px_12px_rgba(58,143,95,0.3)] transition-all hover:bg-[#2E7049] active:scale-95 disabled:opacity-50"
                >
                  {loginPending ? "Logging in…" : "Log In"}
                </button>
              </form>
            ) : (
              <form action={signupDispatch} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold tracking-[0.15em] text-[#4A6857] uppercase">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold tracking-[0.15em] text-[#4A6857] uppercase">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    autoComplete="new-password"
                    placeholder="8+ characters"
                    className={inputCls}
                  />
                </div>
                {error && (
                  <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-400">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={pending}
                  className="mt-2 w-full rounded-xl bg-[#3A8F5F] py-3 text-sm font-semibold text-white shadow-[0_2px_12px_rgba(58,143,95,0.3)] transition-all hover:bg-[#2E7049] active:scale-95 disabled:opacity-50"
                >
                  {signupPending ? "Creating account…" : "Create Account"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
