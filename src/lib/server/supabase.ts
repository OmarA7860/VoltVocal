import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { EstimateLineItem } from "@/types/estimate";
import type { PriceItem } from "@/types/price";

type EstimateRow = {
  id: string;
  created_at: string;
  total: number;
  notes: string;
  transcript: string;
  line_items: EstimateLineItem[];
  client_name: string;
  client_address: string;
};

type ContractorProfileRow = {
  id: string;
  company_name: string;
  license_number: string;
  phone: string;
  email: string;
};

type Database = {
  public: {
    Tables: {
      estimates: {
        Row: EstimateRow;
        Insert: Omit<EstimateRow, "id" | "created_at">;
        Update: Partial<Omit<EstimateRow, "id" | "created_at">>;
        Relationships: [];
      };
      price_list: {
        Row: PriceItem;
        Insert: Omit<PriceItem, "id" | "created_at">;
        Update: Partial<Omit<PriceItem, "id" | "created_at">>;
        Relationships: [];
      };
      contractor_profile: {
        Row: ContractorProfileRow;
        Insert: ContractorProfileRow;
        Update: Partial<Omit<ContractorProfileRow, "id">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type SupabaseClient = ReturnType<typeof createClient<Database>>;

export function getSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("[Supabase] Missing env vars:", { hasUrl: !!url, hasKey: !!key });
    throw new Error("CONFIG_MISSING");
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false },
    global: {
      headers: {
        "x-application-name": "voltvocal",
      },
    },
  });
}
