"use server";

import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/server/rate-limit";
import {
  sanitizeUserEditedText,
  sanitizeNumericInput,
} from "@/lib/sanitize-ai-text";
import type { PriceItem } from "@/types/price";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_CATEGORIES = ["general", "receptacles", "cable", "labor", "misc"] as const;
type Category = (typeof VALID_CATEGORIES)[number];

type ItemInput = {
  name: string;
  unit: string;
  unit_price: number;
  category: string;
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

function mapError(e: unknown): string {
  if (!(e instanceof Error)) return "Something went wrong. Please try again.";
  switch (e.message) {
    case "CONFIG_MISSING":
      return "Service is not configured. Please contact support.";
    case "DB_FETCH_FAILED":
      return "Could not load price list. Please refresh.";
    case "DB_INSERT_FAILED":
      return "Could not save item. Please try again.";
    case "DB_UPDATE_FAILED":
      return "Could not update item. Please try again.";
    case "DB_DELETE_FAILED":
      return "Could not delete item. Please try again.";
    case "INVALID_INPUT":
      return "Invalid input. Check the item name and price.";
    default:
      return "Something went wrong. Please try again.";
  }
}

function sanitizeInput(input: ItemInput): {
  name: string;
  unit: string;
  unit_price: number;
  category: Category;
} {
  const name = sanitizeUserEditedText(input.name, 200);
  const unit = sanitizeUserEditedText(input.unit, 50);
  const unit_price = sanitizeNumericInput(input.unit_price, 0, 99999, 0);
  const category: Category = VALID_CATEGORIES.includes(input.category as Category)
    ? (input.category as Category)
    : "general";
  return { name, unit, unit_price, category };
}

export async function getPriceListAction(): Promise<
  { ok: true; items: PriceItem[] } | { ok: false; error: string }
> {
  try {
    const key = await rateLimitKey("pl-get");
    if (!checkRateLimit(key)) {
      return { ok: false, error: "Too many requests. Please wait a few minutes." };
    }

    const { getSupabaseClient } = await import("@/lib/server/supabase");
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("price_list")
      .select("id, created_at, name, unit, unit_price, category")
      .order("name");

    if (error) throw new Error("DB_FETCH_FAILED");
    return { ok: true, items: data ?? [] };
  } catch (e) {
    return { ok: false, error: mapError(e) };
  }
}

export async function savePriceItemAction(
  input: ItemInput,
): Promise<{ ok: true; item: PriceItem } | { ok: false; error: string }> {
  try {
    const key = await rateLimitKey("pl-save");
    if (!checkRateLimit(key)) {
      return { ok: false, error: "Too many requests. Please wait a few minutes." };
    }

    const sanitized = sanitizeInput(input);
    if (!sanitized.name) throw new Error("INVALID_INPUT");

    const { getSupabaseClient } = await import("@/lib/server/supabase");
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("price_list")
      .insert(sanitized)
      .select()
      .single();

    if (error) {
      console.error("[Supabase price insert] code:", error.code, "message:", error.message, "details:", error.details, "hint:", error.hint);
      throw new Error("DB_INSERT_FAILED");
    }
    return { ok: true, item: data };
  } catch (e) {
    return { ok: false, error: mapError(e) };
  }
}

export async function updatePriceItemAction(
  id: string,
  input: ItemInput,
): Promise<{ ok: true; item: PriceItem } | { ok: false; error: string }> {
  try {
    if (!id || typeof id !== "string" || !UUID_RE.test(id)) {
      return { ok: false, error: "Invalid item ID." };
    }

    const key = await rateLimitKey("pl-upd");
    if (!checkRateLimit(key)) {
      return { ok: false, error: "Too many requests. Please wait a few minutes." };
    }

    const sanitized = sanitizeInput(input);
    if (!sanitized.name) throw new Error("INVALID_INPUT");

    const { getSupabaseClient } = await import("@/lib/server/supabase");
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("price_list")
      .update(sanitized)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Supabase price update] code:", error.code, "message:", error.message, "details:", error.details, "hint:", error.hint);
      throw new Error("DB_UPDATE_FAILED");
    }
    return { ok: true, item: data };
  } catch (e) {
    return { ok: false, error: mapError(e) };
  }
}

export async function deletePriceItemAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (!id || typeof id !== "string" || !UUID_RE.test(id)) {
      return { ok: false, error: "Invalid item ID." };
    }

    const key = await rateLimitKey("pl-del");
    if (!checkRateLimit(key)) {
      return { ok: false, error: "Too many requests. Please wait a few minutes." };
    }

    const { getSupabaseClient } = await import("@/lib/server/supabase");
    const supabase = getSupabaseClient();

    const { error } = await supabase.from("price_list").delete().eq("id", id);

    if (error) {
      console.error("[Supabase price delete] code:", error.code, "message:", error.message, "details:", error.details, "hint:", error.hint);
      throw new Error("DB_DELETE_FAILED");
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: mapError(e) };
  }
}
