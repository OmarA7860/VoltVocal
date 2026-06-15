import Link from "next/link";
import Image from "next/image";
import { EstimateRecorder } from "@/components/estimate-recorder";
import { InstallPrompt } from "@/components/install-prompt";

export default function DashboardPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#090D0B]">
      {/* Header */}
      <header className="hidden md:flex sticky top-0 z-30 border-b border-[#1E3025] bg-[#090D0B]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-3">
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Image
              src="/logo-mark.png"
              alt="VoltVocal"
              width={40}
              height={40}
              style={{ objectFit: "contain", filter: "brightness(0) invert(1)" }}
            />
            <div>
              <div className="text-xs font-bold tracking-widest text-[#E0EDE5] uppercase sm:text-sm">
                VoltVocal
              </div>
              <div className="hidden text-[9px] tracking-[0.18em] text-[#4A6857] uppercase sm:block">
                Field Estimating
              </div>
            </div>
          </div>

          <nav className="ml-auto flex items-center gap-0.5 sm:gap-1">
            <Link
              href="/dashboard"
              className="relative flex min-h-[36px] items-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-semibold tracking-wider text-[#4DB87B] uppercase transition-colors sm:gap-1.5 sm:px-3 sm:text-[11px]"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#4DB87B]" />
              Home
              <span className="absolute inset-0 rounded-md bg-[#3A8F5F]/10" />
            </Link>
            <Link
              href="/dashboard/estimates"
              className="flex min-h-[36px] items-center rounded-md px-2 py-1.5 text-[10px] font-semibold tracking-wider text-[#4A6857] uppercase transition-colors hover:bg-[#1E3025] hover:text-[#8AA895] sm:px-3 sm:text-[11px]"
            >
              Estimates
            </Link>
            <Link
              href="/dashboard/prices"
              className="flex min-h-[36px] items-center rounded-md px-2 py-1.5 text-[10px] font-semibold tracking-wider text-[#4A6857] uppercase transition-colors hover:bg-[#1E3025] hover:text-[#8AA895] sm:px-3 sm:text-[11px]"
            >
              Prices
            </Link>
            <Link
              href="/dashboard/settings"
              className="flex min-h-[36px] items-center rounded-md px-2 py-1.5 text-[10px] font-semibold tracking-wider text-[#4A6857] uppercase transition-colors hover:bg-[#1E3025] hover:text-[#8AA895] sm:px-3 sm:text-[11px]"
            >
              Settings
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:gap-10 sm:px-6 sm:py-10">
        {/* Hero section heading — hidden on mobile to save space */}
        <div className="hidden sm:block animate-fade-up">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#2A4234] to-transparent" />
            <span className="text-[10px] font-bold tracking-[0.3em] text-[#4A6857] uppercase">
              Voice Capture
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#2A4234] to-transparent" />
          </div>
          <h1 className="text-center text-xl font-bold tracking-tight text-[#E0EDE5] sm:text-3xl">
            Record. Transcribe.{" "}
            <span className="text-[#4DB87B]">Estimate.</span>
          </h1>
          <p className="mx-auto mt-2 hidden max-w-md text-center text-sm text-[#4A6857] sm:block">
            Walk the job site and describe what you see. Groq Whisper transcribes
            the audio, Llama builds structured line items instantly.
          </p>
        </div>

        <EstimateRecorder />

        {/* How it works strip */}
        <p className="mt-6 pb-4 text-center text-[11px] tracking-[0.2em] text-[#4A6857]">
          Speak &nbsp;·&nbsp; AI Structures &nbsp;·&nbsp; Export
        </p>
      </main>

      <InstallPrompt />
    </div>
  );
}
