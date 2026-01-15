import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "@/lib/store";
import { helpshipClient } from "@/lib/helpship";
import { supabaseAdmin } from "@/lib/supabase";
import type { OfferCode } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      landingKey,
      offerCode,
      phone,
      fullName,
      county,
      city,
      address,
      upsells = [],
      subtotal,
      shippingCost,
      total,
    } = body;

    if (
      !landingKey ||
      !offerCode ||
      !phone ||
      !fullName ||
      !county ||
      !city ||
      !address
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const validOfferCodes: OfferCode[] = ["offer_1", "offer_2", "offer_3"];
    if (!validOfferCodes.includes(offerCode)) {
      return NextResponse.json(
        { error: "Invalid offer code" },
        { status: 400 },
      );
    }

    // Obține store_id din landing page pentru a folosi order_series
    const { data: landingPage } = await supabaseAdmin
      .from("landing_pages")
      .select("store_id")
      .eq("slug", landingKey)
      .single();

    let orderSeries = "VLR"; // Default fallback
    if (landingPage?.store_id) {
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("order_series")
        .eq("id", landingPage.store_id)
        .single();

      if (store?.order_series) {
        orderSeries = store.order_series;
      }
    }

    // Creează comanda în baza noastră de date
    const order = await createOrder({
      landingKey,
      offerCode,
      phone,
      fullName,
      county,
      city,
      address,
      upsells,
      subtotal: Number(subtotal) || 0,
      shippingCost: Number(shippingCost) || 0,
      total: Number(total) || 0,
    });

    // Încearcă să creeze comanda în Helpship cu status ONHOLD
    // Dacă eșuează, comanda rămâne în DB dar cu status 'sync_error'
    let helpshipOrderId: string | undefined;
    let helpshipError: any = null;
    try {
      console.log("[Helpship] Attempting to create order...");
      const helpshipResult = await helpshipClient.createOrder({
        orderId: order.id, // ID-ul nostru intern (externalId în Helpship)
        orderNumber: order.orderNumber || 0, // Numărul comenzii pentru ORDER NAME
        orderSeries: orderSeries, // Order series din store
        customerName: fullName,
        customerPhone: phone,
        county,
        city,
        address,
        offerCode,
        subtotal: Number(subtotal) || 0,
        shippingCost: Number(shippingCost) || 0,
        total: Number(total) || 0,
        upsells,
      });

      console.log("[Helpship] Order created successfully:", helpshipResult);
      helpshipOrderId = helpshipResult.orderId;

      // Actualizează comanda cu helpshipOrderId
      if (helpshipOrderId) {
        const { error: updateError } = await supabaseAdmin
          .from("orders")
          .update({ helpship_order_id: helpshipOrderId })
          .eq("id", order.id);

        if (updateError) {
          console.error("[Helpship] Failed to update order with helpshipOrderId:", updateError);
        } else {
          console.log("[Helpship] Order updated with helpshipOrderId:", helpshipOrderId);
        }
      }
    } catch (err) {
      // Loghează eroarea detaliată și setează status la 'sync_error'
      helpshipError = err;
      console.error("[Helpship] Failed to create order in Helpship:", {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });

      // Actualizează comanda cu status 'sync_error'
      const { error: statusUpdateError } = await supabaseAdmin
        .from("orders")
        .update({ status: "sync_error" })
        .eq("id", order.id);

      if (statusUpdateError) {
        console.error("[Helpship] Failed to update order status to sync_error:", statusUpdateError);
      } else {
        console.log("[Helpship] Order status updated to sync_error");
      }
    }

    return NextResponse.json(
      {
        orderId: order.id,
        helpshipOrderId: helpshipOrderId || null,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating order", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

