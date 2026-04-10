"use server";

export type ContractorProfile = {
  company_name: string;
  license_number: string;
  phone: string;
  email: string;
};

export async function getContractorProfileAction(): Promise<
  { ok: true; profile: ContractorProfile | null } | { ok: false; error: string }
> {
  try {
    const { getSupabaseClient } = await import("@/lib/server/supabase");
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("contractor_profile")
      .select("company_name, license_number, phone, email")
      .limit(1)
      .maybeSingle();
    if (error) throw new Error("DB_FETCH_FAILED");
    return { ok: true, profile: data };
  } catch {
    return { ok: false, error: "Could not load contractor profile." };
  }
}

export async function saveContractorProfileAction(
  profile: ContractorProfile,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { getSupabaseClient } = await import("@/lib/server/supabase");
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("contractor_profile")
      .upsert({ id: 1, ...profile }, { onConflict: "id" });
    if (error) throw new Error("DB_UPSERT_FAILED");
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not save contractor profile." };
  }
}
