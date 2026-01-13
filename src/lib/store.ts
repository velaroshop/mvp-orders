import type { Order, OfferCode } from "./types";
import { supabase } from "./supabase";

// Store folosind Supabase PostgreSQL

export async function createOrder(input: {
  landingKey: string;
  offerCode: OfferCode;
  phone: string;
  fullName: string;
  county: string;
  city: string;
  address: string;
  upsells?: string[];
  subtotal: number;
  shippingCost: number;
  total: number;
}): Promise<Order> {
  const { data, error } = await supabase
    .from("orders")
    .insert({
      landing_key: input.landingKey,
      offer_code: input.offerCode,
      phone: input.phone,
      full_name: input.fullName,
      county: input.county,
      city: input.city,
      address: input.address,
      upsells: input.upsells ?? [],
      subtotal: input.subtotal,
      shipping_cost: input.shippingCost,
      total: input.total,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create order: ${error.message}`);
  }

    // Map Supabase row to Order type
  return {
    id: data.id,
    landingKey: data.landing_key,
    offerCode: data.offer_code as OfferCode,
    phone: data.phone,
    fullName: data.full_name,
    county: data.county,
    city: data.city,
    address: data.address,
    postalCode: data.postal_code ?? undefined,
    upsells: data.upsells as string[],
    subtotal: parseFloat(data.subtotal.toString()),
    shippingCost: parseFloat(data.shipping_cost.toString()),
    total: parseFloat(data.total.toString()),
    status: data.status as "pending" | "confirmed",
    helpshipOrderId: data.helpship_order_id ?? undefined,
    orderNumber: data.order_number ?? undefined,
    createdAt: data.created_at,
  };
}

export async function listOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list orders: ${error.message}`);
  }

  // Map Supabase rows to Order type
  return (data || []).map((row) => ({
    id: row.id,
    landingKey: row.landing_key,
    offerCode: row.offer_code as OfferCode,
    phone: row.phone,
    fullName: row.full_name,
    county: row.county,
    city: row.city,
    address: row.address,
    postalCode: row.postal_code ?? undefined,
    upsells: row.upsells as string[],
    subtotal: parseFloat(row.subtotal.toString()),
    shippingCost: parseFloat(row.shipping_cost.toString()),
    total: parseFloat(row.total.toString()),
    status: row.status as "pending" | "confirmed",
    helpshipOrderId: row.helpship_order_id ?? undefined,
    orderNumber: row.order_number ?? undefined,
    createdAt: row.created_at,
  }));
}

/**
 * Obține prefix-ul pentru numărul comenzii din settings
 */
export async function getOrderPrefix(): Promise<string> {
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "order_prefix")
    .single();

  if (error || !data) {
    // Fallback la default dacă nu există în DB
    return "JMR-TEST";
  }

  return data.value;
}

