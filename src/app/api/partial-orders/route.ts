import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/partial-orders - Save/update a partial order
 * This endpoint is called from the landing page form as user fills fields
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      partialOrderId, // If updating existing partial order
      organizationId,
      landingKey,
      offerCode,
      phone,
      fullName,
      county,
      city,
      address,
      postalCode,
      productName,
      productSku,
      productQuantity,
      upsells = [],
      subtotal,
      shippingCost,
      total,
      lastCompletedField,
    } = body;

    // Calculate completion percentage based on required fields
    const requiredFields = ["phone", "fullName", "county", "city", "address"];
    const completedFields = requiredFields.filter((field) => {
      const value = body[field];
      return value && value.trim() !== "";
    });
    const completionPercentage = Math.round(
      (completedFields.length / requiredFields.length) * 100
    );

    const now = new Date().toISOString();

    if (partialOrderId) {
      // Update existing partial order (only if still pending)
      const { data, error } = await supabaseAdmin
        .from("partial_orders")
        .update({
          offer_code: offerCode,
          phone,
          full_name: fullName,
          county,
          city,
          address,
          postal_code: postalCode,
          product_name: productName,
          product_sku: productSku,
          product_quantity: productQuantity,
          upsells,
          subtotal,
          shipping_cost: shippingCost,
          total,
          last_completed_field: lastCompletedField,
          completion_percentage: completionPercentage,
          updated_at: now,
        })
        .eq("id", partialOrderId)
        .eq("status", "pending")
        .select();

      if (error) {
        console.error("Error updating partial order:", error);
        return NextResponse.json(
          { error: "Failed to update partial order" },
          { status: 500 }
        );
      }

      // If no rows updated (partial order was confirmed/deleted), return silently
      if (!data || data.length === 0) {
        return NextResponse.json({ partialOrder: null, expired: true });
      }

      return NextResponse.json({ partialOrder: data[0] });
    } else {
      // Check for existing partial order with same phone + landing page (dedup race condition)
      if (phone && organizationId && landingKey) {
        const cleanPhone = String(phone).replace(/\D/g, "");
        const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();
        const { data: existing } = await supabaseAdmin
          .from("partial_orders")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("landing_key", landingKey)
          .eq("phone", cleanPhone)
          .eq("status", "pending")
          .gte("created_at", thirtySecondsAgo)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing) {
          // Update the existing one instead of creating a duplicate
          const { data: updated, error: updateError } = await supabaseAdmin
            .from("partial_orders")
            .update({
              offer_code: offerCode,
              phone,
              full_name: fullName,
              county,
              city,
              address,
              postal_code: postalCode,
              product_name: productName,
              product_sku: productSku,
              product_quantity: productQuantity,
              upsells,
              subtotal,
              shipping_cost: shippingCost,
              total,
              last_completed_field: lastCompletedField,
              completion_percentage: completionPercentage,
              updated_at: now,
            })
            .eq("id", existing.id)
            .select()
            .single();

          if (!updateError && updated) {
            console.log("[Partial] Dedup: updated existing partial order:", existing.id);
            return NextResponse.json({ partialOrder: updated });
          }
        }
      }

      // Create new partial order
      const { data, error } = await supabaseAdmin
        .from("partial_orders")
        .insert({
          organization_id: organizationId,
          landing_key: landingKey,
          offer_code: offerCode,
          phone,
          full_name: fullName,
          county,
          city,
          address,
          postal_code: postalCode,
          product_name: productName,
          product_sku: productSku,
          product_quantity: productQuantity,
          upsells,
          subtotal,
          shipping_cost: shippingCost,
          total,
          last_completed_field: lastCompletedField,
          completion_percentage: completionPercentage,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating partial order:", error);
        return NextResponse.json(
          { error: "Failed to create partial order" },
          { status: 500 }
        );
      }

      return NextResponse.json({ partialOrder: data }, { status: 201 });
    }
  } catch (error) {
    console.error("Error in POST /api/partial-orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
