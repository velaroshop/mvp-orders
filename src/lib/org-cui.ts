import { supabaseAdmin } from "@/lib/supabase";

/** True when an organization already uses this CUI (digits only), in its registration data or in Billing. */
export async function cuiAlreadyRegistered(cui: string): Promise<boolean> {
  const [{ data: billing }, { data: orgs }] = await Promise.all([
    supabaseAdmin.from("org_billing").select("organization_id").eq("cui", cui).limit(1),
    supabaseAdmin.from("organizations").select("cui").ilike("cui", `%${cui}%`).limit(50),
  ]);
  if (billing && billing.length > 0) return true;
  return (orgs || []).some((o: any) => String(o.cui || "").replace(/\D/g, "") === cui);
}
