import Link from "next/link";
import Image from "next/image";
import { EstimateRecorder } from "@/components/estimate-recorder";
import { SavedEstimates } from "@/components/saved-estimates";
import { InstallPrompt } from "@/components/install-prompt";

export default function DashboardPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#090D0B]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#1E3025] bg-[#090D0B]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
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
          </div>

          <nav className="ml-auto flex items-center gap-1">
            <Link
              href="/dashboard"
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

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-10 sm:px-6 gap-12">
        {/* Hero section heading */}
        <div className="animate-fade-up">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#2A4234] to-transparent" />
            <span className="text-[10px] font-bold tracking-[0.3em] text-[#4A6857] uppercase">
              Voice Capture
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#2A4234] to-transparent" />
          </div>
          <h1 className="text-center text-2xl font-bold tracking-tight text-[#E0EDE5] sm:text-3xl">
            Record. Transcribe.{" "}
            <span className="text-[#4DB87B]">Estimate.</span>
          </h1>
          <p className="mt-2 text-center text-sm text-[#4A6857] max-w-md mx-auto">
            Walk the job site and describe what you see. Groq Whisper transcribes the audio,
            Llama builds structured line items instantly.
          </p>
        </div>

        <EstimateRecorder />

        <SavedEstimates />
      </main>

      <InstallPrompt />
    </div>
  );
}
