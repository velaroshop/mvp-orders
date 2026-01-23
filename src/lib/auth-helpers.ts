/**
 * Authentication and Authorization Helpers
 *
 * Funcții pentru verificarea accesului la resurse
 */

import { supabaseAdmin } from "@/lib/supabase";

/**
 * Verifică dacă o comandă aparține organizației specificate
 */
export async function verifyOrderOwnership(
  orderId: string,
  organizationId: string
): Promise<{ valid: boolean; error?: string }> {
  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("id, organization_id")
    .eq("id", orderId)
    .single();

  if (error || !order) {
    return { valid: false, error: "Order not found" };
  }

  if (order.organization_id !== organizationId) {
    return { valid: false, error: "Access denied: order belongs to another organization" };
  }

  return { valid: true };
}

/**
 * Verifică dacă un client aparține organizației specificate
 */
export async function verifyCustomerOwnership(
  customerId: string,
  organizationId: string
): Promise<{ valid: boolean; error?: string }> {
  const { data: customer, error } = await supabaseAdmin
    .from("customers")
    .select("id, organization_id")
    .eq("id", customerId)
    .single();

  if (error || !customer) {
    return { valid: false, error: "Customer not found" };
  }

  if (customer.organization_id !== organizationId) {
    return { valid: false, error: "Access denied: customer belongs to another organization" };
  }

  return { valid: true };
}

/**
 * Verifică dacă un landing page aparține organizației specificate
 */
export async function verifyLandingPageOwnership(
  landingPageId: string,
  organizationId: string
): Promise<{ valid: boolean; error?: string }> {
  const { data: landingPage, error } = await supabaseAdmin
    .from("landing_pages")
    .select("id, organization_id")
    .eq("id", landingPageId)
    .single();

  if (error || !landingPage) {
    return { valid: false, error: "Landing page not found" };
  }

  if (landingPage.organization_id !== organizationId) {
    return { valid: false, error: "Access denied: landing page belongs to another organization" };
  }

  return { valid: true };
}

/**
 * Verifică dacă un produs aparține organizației specificate
 */
export async function verifyProductOwnership(
  productId: string,
  organizationId: string
): Promise<{ valid: boolean; error?: string }> {
  const { data: product, error } = await supabaseAdmin
    .from("products")
    .select("id, organization_id")
    .eq("id", productId)
    .single();

  if (error || !product) {
    return { valid: false, error: "Product not found" };
  }

  if (product.organization_id !== organizationId) {
    return { valid: false, error: "Access denied: product belongs to another organization" };
  }

  return { valid: true };
}
