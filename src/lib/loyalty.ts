import { supabaseAdmin } from "@/lib/supabase";

// Loyal customer rule: enough delivered orders and a low return rate.
export const LOYAL_MIN_DELIVERED = 3;
export const LOYAL_MAX_RETURN_RATE = 0.25;

export function meetsLoyaltyRule(delivered: number, returned: number): boolean {
  if (delivered < LOYAL_MIN_DELIVERED) return false;
  return returned / (delivered + returned) <= LOYAL_MAX_RETURN_RATE;
}

const CHUNK = 50;

/**
 * Recomputes delivered/returned counts and the loyal flag for the given customers.
 * Manual override wins over the rule; a blacklisted customer is never loyal.
 * Never throws: sync jobs call this after writing tracking_status and must not fail because of it
 * (e.g. when migration 109 has not been run yet).
 */
export async function recalcCustomerLoyalty(customerIds: (string | null | undefined)[]): Promise<void> {
  try {
    const ids = [...new Set(customerIds.filter((id): id is string => !!id))];

    for (let i = 0; i < ids.length; i += CHUNK) {
      const chunk = ids.slice(i, i + CHUNK);

      const [{ data: orders, error: ordersError }, { data: customers, error: customersError }] = await Promise.all([
        supabaseAdmin
          .from("orders")
          .select("customer_id, tracking_status")
          .in("customer_id", chunk)
          .neq("status", "testing"),
        supabaseAdmin
          .from("customers")
          .select("id, is_blacklisted, is_loyal, loyal_since, loyal_override, delivered_count, returned_count")
          .in("id", chunk),
      ]);
      if (ordersError || customersError || !customers) {
        console.warn("[Loyalty] Lookup failed:", ordersError?.message || customersError?.message);
        continue;
      }

      const counts = new Map<string, { delivered: number; returned: number }>();
      for (const o of orders || []) {
        const c = counts.get(o.customer_id) || { delivered: 0, returned: 0 };
        if (o.tracking_status === "Delivered") c.delivered++;
        else if (o.tracking_status === "Returned" || o.tracking_status === "Returning") c.returned++;
        counts.set(o.customer_id, c);
      }

      for (const customer of customers) {
        const { delivered, returned } = counts.get(customer.id) || { delivered: 0, returned: 0 };
        const wanted = customer.loyal_override ?? meetsLoyaltyRule(delivered, returned);
        const isLoyal = !customer.is_blacklisted && wanted;

        if (
          isLoyal === customer.is_loyal &&
          delivered === customer.delivered_count &&
          returned === customer.returned_count
        ) {
          continue;
        }

        const { error: updateError } = await supabaseAdmin
          .from("customers")
          .update({
            is_loyal: isLoyal,
            loyal_since: isLoyal ? customer.loyal_since || new Date().toISOString() : null,
            delivered_count: delivered,
            returned_count: returned,
          })
          .eq("id", customer.id);
        if (updateError) console.warn("[Loyalty] Update failed:", updateError.message);
      }
    }
  } catch (err) {
    console.warn("[Loyalty] Recalculation failed:", err);
  }
}
