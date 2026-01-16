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
      // Update existing partial order
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
        .select()
        .single();

      if (error) {
        console.error("Error updating partial order:", error);
        return NextResponse.json(
          { error: "Failed to update partial order" },
          { status: 500 }
        );
      }

      return NextResponse.json({ partialOrder: data });
    } else {
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
