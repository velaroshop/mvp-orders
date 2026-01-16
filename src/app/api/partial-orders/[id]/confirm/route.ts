import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;

    if (!activeOrganizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 }
      );
    }

    const { id } = await params;

    // Get the partial order
    const { data: partialOrder, error: fetchError } = await supabaseAdmin
      .from("partial_orders")
      .select("*")
      .eq("id", id)
      .eq("organization_id", activeOrganizationId)
      .is("converted_to_order_id", null)
      .single();

    if (fetchError || !partialOrder) {
      console.error("Error fetching partial order:", fetchError);
      return NextResponse.json(
        { error: "Partial order not found or already converted" },
        { status: 404 }
      );
    }

    // Validate that partial order has required fields
    if (
      !partialOrder.phone ||
      !partialOrder.full_name ||
      !partialOrder.county ||
      !partialOrder.city ||
      !partialOrder.address
    ) {
      return NextResponse.json(
        { error: "Partial order is missing required fields for confirmation" },
        { status: 400 }
      );
    }

    // Create or get customer
    let customerId: string;
    const { data: existingCustomer } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("phone", partialOrder.phone)
      .eq("organization_id", activeOrganizationId)
      .single();

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      // Create new customer
      const { data: newCustomer, error: customerError } = await supabaseAdmin
        .from("customers")
        .insert({
          organization_id: activeOrganizationId,
          phone: partialOrder.phone,
          total_orders: 0,
          total_spent: 0,
        })
        .select()
        .single();

      if (customerError || !newCustomer) {
        console.error("Error creating customer:", customerError);
        return NextResponse.json(
          { error: "Failed to create customer" },
          { status: 500 }
        );
      }

      customerId = newCustomer.id;
    }

    // Create the order from partial order
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_id: customerId,
        organization_id: activeOrganizationId,
        landing_key: partialOrder.landing_key,
        offer_code: partialOrder.offer_code,
        phone: partialOrder.phone,
        full_name: partialOrder.full_name,
        county: partialOrder.county,
        city: partialOrder.city,
        address: partialOrder.address,
        postal_code: partialOrder.postal_code,
        product_name: partialOrder.product_name,
        product_sku: partialOrder.product_sku,
        product_quantity: partialOrder.product_quantity,
        upsells: partialOrder.upsells || [],
        subtotal: partialOrder.subtotal,
        shipping_cost: partialOrder.shipping_cost,
        total: partialOrder.total,
        status: "pending",
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error("Error creating order:", orderError);
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 }
      );
    }

    // Update partial order to mark as converted
    const { error: updateError } = await supabaseAdmin
      .from("partial_orders")
      .update({
        status: "accepted",
        converted_to_order_id: order.id,
        converted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error updating partial order:", updateError);
      // Don't fail the request if this update fails, order is already created
    }

    // Send order to Helpship (same logic as in /api/orders/[id]/helpship)
    try {
      const helpshipResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/orders/${order.id}/helpship`,
        {
          method: "POST",
          headers: {
            Cookie: request.headers.get("Cookie") || "",
          },
        }
      );

      if (!helpshipResponse.ok) {
        console.error("Failed to send order to Helpship");
        // Don't fail the request, order is created but Helpship sync failed
      }
    } catch (helpshipError) {
      console.error("Error sending to Helpship:", helpshipError);
      // Don't fail the request
    }

    return NextResponse.json({
      order,
      message: "Partial order confirmed and converted to order",
    });
  } catch (error) {
    console.error("Error in POST /api/partial-orders/[id]/confirm:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
