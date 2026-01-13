import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "@/lib/store";
import { helpshipClient } from "@/lib/helpship";
import { supabase } from "@/lib/supabase";
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
    // Dacă eșuează, comanda rămâne în DB dar fără helpshipOrderId
    let helpshipOrderId: string | undefined;
    try {
      const helpshipResult = await helpshipClient.createOrder({
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

      helpshipOrderId = helpshipResult.orderId;

      // Actualizează comanda cu helpshipOrderId
      if (helpshipOrderId) {
        await supabase
          .from("orders")
          .update({ helpship_order_id: helpshipOrderId })
          .eq("id", order.id);
      }
    } catch (helpshipError) {
      // Loghează eroarea dar nu oprește procesul
      // Comanda este salvată local, poate fi trimisă manual mai târziu
      console.error("Failed to create order in Helpship:", helpshipError);
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

