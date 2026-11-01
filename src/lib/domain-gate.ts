// Server only. Own pages exist only on a verified domain of the organization: nothing can be created or published before one.
import { supabaseAdmin } from "@/lib/supabase";

export const NEEDS_DOMAIN_MESSAGE = "Mai întâi adaugă și verifică un domeniu (Pagini proprii → Domenii). Paginile se creează pe un domeniu verificat.";

/** A verified (or active) domain of this organization, by id; null when it is not one */
export async function findUsableDomain(organizationId: string, domainId: string): Promise<{ id: string; hostname: string } | null> {
  const { data } = await supabaseAdmin
    .from("page_domains")
    .select("id, hostname")
    .eq("id", domainId)
    .eq("organization_id", organizationId)
    .in("status", ["verified", "active"])
    .maybeSingle();
  return data;
}

export async function hasUsableDomain(organizationId: string): Promise<boolean> {
  const { count } = await supabaseAdmin
    .from("page_domains")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .in("status", ["verified", "active"]);
  return (count ?? 0) > 0;
}
