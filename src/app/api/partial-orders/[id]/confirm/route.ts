import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import type { OfferCode } from "@/lib/types";

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
    const body = await request.json();

    // Data from modal
    const { fullName, phone, county, city, address, selectedOffer } = body as {
      fullName: string;
      phone: string;
      county: string;
      city: string;
      address: string;
      selectedOffer: OfferCode;
    };

    // Validate required fields
    if (!fullName || !phone || !county || !city || !address) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Validate phone number (10 digits, starts with 07)
    if (phone.length !== 10 || !phone.startsWith("07")) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 }
      );
    }

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

    // Fetch landing page to get product details and pricing for selected offer
    const { data: landingPage, error: lpError } = await supabaseAdmin
      .from("landing_pages")
      .select("*, products(*)")
      .eq("slug", partialOrder.landing_key)
      .single();

    if (lpError || !landingPage) {
      console.error("Error fetching landing page:", lpError);
      return NextResponse.json(
        { error: "Landing page not found" },
        { status: 404 }
      );
    }

    // Get quantity and price for selected offer
    let quantity = 1;
    let price = 0;

    if (selectedOffer === "offer_1") {
      quantity = landingPage.quantity_offer_1 || 1;
      price = landingPage.price_offer_1 || 0;
    } else if (selectedOffer === "offer_2") {
      quantity = landingPage.quantity_offer_2 || 2;
      price = landingPage.price_offer_2 || 0;
    } else if (selectedOffer === "offer_3") {
      quantity = landingPage.quantity_offer_3 || 3;
      price = landingPage.price_offer_3 || 0;
    }

    const subtotal = price;
    const shippingCost = landingPage.shipping_price || 0;
    const total = subtotal + shippingCost;

    // Create or get customer
    let customerId: string;
    const { data: existingCustomer } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("phone", phone)
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
          phone: phone,
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

    // Create the order from partial order with edited data
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_id: customerId,
        organization_id: activeOrganizationId,
        landing_key: partialOrder.landing_key,
        offer_code: selectedOffer,
        phone: phone,
        full_name: fullName,
        county: county,
        city: city,
        address: address,
        postal_code: null, // Will be set by Helpship
        product_name: landingPage.products?.name || partialOrder.product_name,
        product_sku: landingPage.products?.sku || partialOrder.product_sku,
        product_quantity: quantity,
        upsells: partialOrder.upsells || [],
        subtotal: subtotal,
        shipping_cost: shippingCost,
        total: total,
        status: "pending",
        from_partial_id: id, // Mark that this order comes from a partial
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
