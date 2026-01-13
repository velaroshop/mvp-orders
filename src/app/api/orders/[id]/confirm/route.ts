import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { helpshipClient } from "@/lib/helpship";

/**
 * Confirmă o comandă: actualizează datele în Helpship și schimbă status-ul din ONHOLD în PENDING
 * Primește datele actualizate din modal
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: orderId } = await params;
    const body = await request.json();

    // Datele actualizate din modal
    const {
      fullName,
      phone,
      county,
      city,
      address,
      postalCode,
      shippingPrice,
      discount,
    } = body;

    // Găsește comanda în DB
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 },
      );
    }

    if (order.status === "confirmed") {
      return NextResponse.json(
        { error: "Order already confirmed" },
        { status: 400 },
      );
    }

    // Dacă comanda are helpshipOrderId, actualizează-o în Helpship
    if (order.helpship_order_id) {
      try {
        console.log(`[Helpship] Updating order ${order.helpship_order_id} with new data and setting status to PENDING...`);
        
        // Actualizăm datele și setăm status-ul la PENDING (unhold)
        await helpshipClient.updateOrder(order.helpship_order_id, {
          status: "PENDING", // Va folosi /unhold endpoint
          paymentStatus: "Pending",
          customerName: fullName || order.fullName,
          customerPhone: phone || order.phone,
          postalCode: postalCode,
          shippingAddress: {
            county: county || order.county,
            city: city || order.city,
            address: address || order.address,
            zip: postalCode,
          },
        });
        
        console.log(`[Helpship] Order ${order.helpship_order_id} updated and status set to PENDING.`);
      } catch (helpshipError) {
        // Loghează eroarea dar continuă cu update-ul local
        console.error("Failed to update order in Helpship:", helpshipError);
        // Poți alege să returnezi eroare sau să continui
        // Pentru MVP, continuăm cu update-ul local
      }
    }

    // Actualizează datele în DB (dacă au fost modificate)
    const updateData: any = { status: "confirmed" };
    if (fullName) updateData.full_name = fullName;
    if (phone) updateData.phone = phone;
    if (county) updateData.county = county;
    if (city) updateData.city = city;
    if (address) updateData.address = address;
    if (postalCode) updateData.postal_code = postalCode;
    if (shippingPrice !== undefined) updateData.shipping_cost = shippingPrice;

    // Actualizează status-ul în DB
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: "confirmed" })
      .eq("id", orderId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error confirming order", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
