"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOS() {
  return (
    typeof navigator !== "undefined" &&
    /iphone|ipad|ipod/i.test(navigator.userAgent)
  );
}

function isStandalone() {
  return (
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator &&
        (window.navigator as { standalone?: boolean }).standalone === true))
  );
}

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const ios = isIOS();

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem("pwa-install-dismissed") === "1") return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    const timer = setTimeout(() => setShow(true), 30_000);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, []);

  function dismiss() {
    localStorage.setItem("pwa-install-dismissed", "1");
    setShow(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShow(false);
    setDeferredPrompt(null);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50">
      <div className="animate-fade-up mx-auto max-w-md rounded-2xl border border-[#2A4234] bg-[#0E1612]/95 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#3A8F5F]/15 ring-1 ring-[#3A8F5F]/30">
            <img src="/voltvocal-logo.png" alt="" className="h-5 w-5 object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#E0EDE5]">
              Add VoltVocal to your home screen
            </p>
            {ios ? (
              <p className="mt-1 text-xs text-[#8AA895]">
                Tap the{" "}
                <span className="font-semibold text-[#4DB87B]">share button</span>{" "}
                then{" "}
                <span className="font-semibold text-[#4DB87B]">Add to Home Screen</span>
              </p>
            ) : (
              <button
                onClick={() => void install()}
                className="mt-2 rounded-lg bg-[#3A8F5F] px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-[#2E7049] active:scale-95"
              >
                Install App
              </button>
            )}
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="shrink-0 rounded-md p-1 text-[#4A6857] transition-colors hover:bg-[#1E3025] hover:text-[#8AA895]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
