"use server";

import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { sanitizeUserEditedText } from "@/lib/sanitize-ai-text";

export type ContractorProfile = {
  company_name: string;
  license_number: string;
  phone: string;
  email: string;
};

async function rateLimitKey(prefix: string): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  const ip =
    xff?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    h.get("cf-connecting-ip") ??
    "unknown";
  return `${prefix}:${ip}`;
}

// Strips everything except digits, spaces, +, -, (, ), and dots.
function sanitizePhone(raw: string): string {
  return raw.replace(/[^\d\s+\-().]/g, "").trim().slice(0, 40);
}

// Validates a basic email shape and lowercases it.
function sanitizeEmail(raw: string): string {
  const s = sanitizeUserEditedText(raw, 120).toLowerCase();
  // Must contain exactly one @ with at least one char on each side.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : "";
}

function sanitizeProfile(raw: ContractorProfile): ContractorProfile {
  return {
    company_name:   sanitizeUserEditedText(raw.company_name,   120),
    license_number: sanitizeUserEditedText(raw.license_number,  60),
    phone:          sanitizePhone(raw.phone ?? ""),
    email:          sanitizeEmail(raw.email ?? ""),
  };
}

function logError(label: string, e: unknown): void {
  if (process.env.NODE_ENV === "development") {
    console.error(label, e instanceof Error ? e.stack : e);
  } else {
    console.error(label, e instanceof Error ? e.message : "unknown error");
  }
}

export async function getContractorProfileAction(): Promise<
  { ok: true; profile: ContractorProfile | null } | { ok: false; error: string }
> {
  try {
    const key = await rateLimitKey("cfg-get");
    if (!checkRateLimit(key)) {
      return { ok: false, error: "Too many requests. Please wait a few minutes." };
    }

    const { getSupabaseClient } = await import("@/lib/server/supabase");
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("contractor_profile")
      .select("company_name, license_number, phone, email")
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return { ok: true, profile: data };
  } catch (e) {
    logError("[getContractorProfileAction]", e);
    return { ok: false, error: "Could not load contractor profile." };
  }
}

const PROFILE_ID = "00000000-0000-0000-0000-000000000001";

export async function saveContractorProfileAction(
  profile: ContractorProfile,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const key = await rateLimitKey("cfg-save");
    if (!checkRateLimit(key)) {
      return { ok: false, error: "Too many requests. Please wait a few minutes." };
    }

    if (!profile || typeof profile !== "object") {
      return { ok: false, error: "Invalid profile data." };
    }

    const safe = sanitizeProfile(profile);

    const { getSupabaseClient } = await import("@/lib/server/supabase");
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("contractor_profile")
      .upsert(
        {
          id: PROFILE_ID,
          company_name:   safe.company_name,
          license_number: safe.license_number,
          phone:          safe.phone,
          email:          safe.email,
        },
        { onConflict: "id" },
      );
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    logError("[saveContractorProfileAction]", e);
    return { ok: false, error: "Could not save contractor profile." };
  }
}
