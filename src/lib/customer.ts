import { supabaseAdmin } from "./supabase";
import type { Customer } from "./types";

/**
 * Find or create a customer by phone number
 * Returns existing customer or creates a new one
 */
export async function findOrCreateCustomer({
  organizationId,
  phone,
}: {
  organizationId: string;
  phone: string;
}): Promise<Customer> {
  // Normalize phone number (remove non-digits)
  const normalizedPhone = phone.replace(/\D/g, '');

  // Try to find existing customer
  const { data: existing, error: findError } = await supabaseAdmin
    .from("customers")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("phone", normalizedPhone)
    .single();

  if (existing) {
    // Map database row to Customer type
    return {
      id: existing.id,
      organizationId: existing.organization_id,
      phone: existing.phone,
      firstOrderDate: existing.first_order_date,
      lastOrderDate: existing.last_order_date,
      totalOrders: existing.total_orders || 0,
      totalSpent: parseFloat(existing.total_spent?.toString() || "0"),
      createdAt: existing.created_at,
      updatedAt: existing.updated_at,
    };
  }

  // Create new customer
  const now = new Date().toISOString();
  const { data: newCustomer, error: createError } = await supabaseAdmin
    .from("customers")
    .insert({
      organization_id: organizationId,
      phone: normalizedPhone,
      first_order_date: now,
      last_order_date: now,
      total_orders: 0,
      total_spent: 0,
    })
    .select()
    .single();

  if (createError || !newCustomer) {
    throw new Error(`Failed to create customer: ${createError?.message || "Unknown error"}`);
  }

  return {
    id: newCustomer.id,
    organizationId: newCustomer.organization_id,
    phone: newCustomer.phone,
    firstOrderDate: newCustomer.first_order_date,
    lastOrderDate: newCustomer.last_order_date,
    totalOrders: newCustomer.total_orders || 0,
    totalSpent: parseFloat(newCustomer.total_spent?.toString() || "0"),
    createdAt: newCustomer.created_at,
    updatedAt: newCustomer.updated_at,
  };
}

/**
 * Update customer stats after a new order
 */
export async function updateCustomerStats({
  customerId,
  orderTotal,
}: {
  customerId: string;
  orderTotal: number;
}): Promise<void> {
  const now = new Date().toISOString();

  // First, get current values
  const { data: customer, error: fetchError } = await supabaseAdmin
    .from("customers")
    .select("total_orders, total_spent")
    .eq("id", customerId)
    .single();

  if (fetchError || !customer) {
    console.error("Failed to fetch customer for stats update:", fetchError);
    return;
  }

  // Update with incremented values
  const { error } = await supabaseAdmin
    .from("customers")
    .update({
      last_order_date: now,
      total_orders: (customer.total_orders || 0) + 1,
      total_spent: parseFloat(customer.total_spent?.toString() || "0") + orderTotal,
      updated_at: now,
    })
    .eq("id", customerId);

  if (error) {
    console.error("Failed to update customer stats:", error);
    // Don't throw - this is not critical for order creation
  }
}

/**
 * Get customer by phone number
 */
export async function getCustomerByPhone({
  organizationId,
  phone,
}: {
  organizationId: string;
  phone: string;
}): Promise<Customer | null> {
  const normalizedPhone = phone.replace(/\D/g, '');

  const { data, error } = await supabaseAdmin
    .from("customers")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("phone", normalizedPhone)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    organizationId: data.organization_id,
    phone: data.phone,
    firstOrderDate: data.first_order_date,
    lastOrderDate: data.last_order_date,
    totalOrders: data.total_orders || 0,
    totalSpent: parseFloat(data.total_spent?.toString() || "0"),
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
