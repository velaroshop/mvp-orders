import type { Order, OfferCode, OrderStatus } from "./types";
import { supabase, supabaseAdmin } from "./supabase";

// Store folosind Supabase PostgreSQL

export async function createOrder(input: {
  customerId: string;
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
  organizationId: string;
  productName?: string | null;
  productSku?: string | null;
  productQuantity?: number;
}): Promise<Order> {
  // Calculate queue expiration time (3 minutes from now)
  const queueExpiresAt = new Date(Date.now() + 3 * 60 * 1000).toISOString();

  // Folosim supabaseAdmin pentru a bypassa RLS când creăm comenzi din formularul public
  const { data, error } = await supabaseAdmin
    .from("orders")
    .insert({
      organization_id: input.organizationId,
      customer_id: input.customerId,
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
      status: "queue",
      queue_expires_at: queueExpiresAt,
      product_name: input.productName,
      product_sku: input.productSku,
      product_quantity: input.productQuantity,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create order: ${error.message}`);
  }

    // Map Supabase row to Order type
  return {
    id: data.id,
    customerId: data.customer_id,
    landingKey: data.landing_key,
    offerCode: data.offer_code as OfferCode,
    phone: data.phone,
    fullName: data.full_name,
    county: data.county,
    city: data.city,
    address: data.address,
    postalCode: data.postal_code ?? undefined,
    productName: data.product_name ?? undefined,
    productSku: data.product_sku ?? undefined,
    productQuantity: data.product_quantity ?? undefined,
    upsells: data.upsells as string[],
    subtotal: parseFloat(data.subtotal.toString()),
    shippingCost: parseFloat(data.shipping_cost.toString()),
    total: parseFloat(data.total.toString()),
    status: data.status as OrderStatus,
    helpshipOrderId: data.helpship_order_id ?? undefined,
    orderNumber: data.order_number ?? undefined,
    orderNote: data.order_note ?? undefined,
    queueExpiresAt: data.queue_expires_at ?? undefined,
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
    customerId: row.customer_id,
    landingKey: row.landing_key,
    offerCode: row.offer_code as OfferCode,
    phone: row.phone,
    fullName: row.full_name,
    county: row.county,
    city: row.city,
    address: row.address,
    postalCode: row.postal_code ?? undefined,
    productName: row.product_name ?? undefined,
    productSku: row.product_sku ?? undefined,
    productQuantity: row.product_quantity ?? undefined,
    upsells: row.upsells as string[],
    subtotal: parseFloat(row.subtotal.toString()),
    shippingCost: parseFloat(row.shipping_cost.toString()),
    total: parseFloat(row.total.toString()),
    status: row.status as OrderStatus,
    helpshipOrderId: row.helpship_order_id ?? undefined,
    orderNumber: row.order_number ?? undefined,
    orderNote: row.order_note ?? undefined,
    queueExpiresAt: row.queue_expires_at ?? undefined,
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

