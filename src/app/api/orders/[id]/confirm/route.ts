import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getHelpshipCredentials } from "@/lib/helpship-credentials";
import { HelpshipClient } from "@/lib/helpship";

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
    const { data: order, error: fetchError } = await supabaseAdmin
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

    // Dacă comanda are helpshipOrderId, verificăm statusul în Helpship
    if (order.helpship_order_id) {
      try {
        // Obține credențialele Helpship pentru organizație
        const credentials = await getHelpshipCredentials(order.organization_id);
        const helpshipClient = new HelpshipClient(credentials);

        // Verificăm statusul comenzii în Helpship
        const orderStatus = await helpshipClient.getOrderStatus(order.helpship_order_id);
        
        if (!orderStatus) {
          return NextResponse.json(
            { error: "Nu s-a putut verifica statusul comenzii în Helpship" },
            { status: 500 },
          );
        }

        // Verificăm că statusul este OnHold sau Pending
        const statusName = orderStatus.statusName;
        if (statusName !== "OnHold" && statusName !== "Pending") {
          return NextResponse.json(
            { 
              error: "Comanda nu mai poate fi modificată",
              helpshipStatus: statusName,
            },
            { status: 400 },
          );
        }

        console.log(`[Helpship] Order ${order.helpship_order_id} has status ${statusName}, proceeding with update...`);

        // Dacă statusul este OnHold, trebuie să facem unhold după update
        // Dacă statusul este Pending, facem doar update la adresă (fără unhold)
        const shouldUnhold = statusName === "OnHold";

        // Actualizăm datele în Helpship
        await helpshipClient.updateOrder(order.helpship_order_id, {
          // Doar dacă e OnHold, setăm status la PENDING (va face unhold)
          // Dacă e deja Pending, nu setăm status (doar update la adresă)
          status: shouldUnhold ? "PENDING" : undefined,
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
        
        console.log(`[Helpship] Order ${order.helpship_order_id} updated successfully.`);
      } catch (helpshipError) {
        console.error("Failed to update order in Helpship:", helpshipError);
        // Aruncăm eroarea pentru a fi prinsă de frontend
        const errorMessage = helpshipError instanceof Error ? helpshipError.message : "Eroare la actualizarea comenzii în Helpship";
        return NextResponse.json(
          { error: errorMessage },
          { status: 500 },
        );
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
    const { error: updateError } = await supabaseAdmin
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
