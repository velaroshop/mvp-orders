import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getHelpshipCredentials } from "@/lib/helpship-credentials";
import { HelpshipClient } from "@/lib/helpship";

/**
 * Pune o comandă pe hold: schimbă status-ul în OnHold în Helpship și în "hold" în MVP
 * Primește o notă opțională (max 2 linii) care va fi salvată în DB
 *
 * Logica cu verificare post-operație:
 * 1. Apelează POST /api/Order/{id}/hold pentru a pune comanda pe hold
 * 2. Verifică statusul DUPĂ operație pentru a confirma că este efectiv OnHold
 * 3. Dacă verificarea confirmă OnHold → actualizează MVP la "hold" + salvează nota
 * 4. Dacă statusul nu este OnHold → returnează eroare (operația a eșuat silent)
 *
 * Aceasta previne situații când Helpship returnează 200 OK dar nu schimbă statusul
 * (ex: comandă anulată, arhivată, sau alte statusuri care nu permit hold)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: orderId } = await params;
    const body = await request.json();
    const { note } = body;

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

    // Verificăm dacă comanda are Helpship ID
    if (!order.helpship_order_id) {
      return NextResponse.json(
        { error: "Comanda nu are Helpship ID" },
        { status: 400 },
      );
    }

    // Obține credențialele Helpship pentru organizație
    const credentials = await getHelpshipCredentials(order.organization_id);
    const helpshipClient = new HelpshipClient(credentials);

    // Încercăm să punem comanda pe hold în Helpship
    console.log(`[Hold] Setting order ${orderId} to OnHold in Helpship...`);

    try {
      await helpshipClient.setOrderStatus(order.helpship_order_id, "OnHold");
      console.log(`[Helpship] Order ${order.helpship_order_id} hold request sent successfully.`);
    } catch (helpshipError) {
      console.error("Failed to set order to OnHold in Helpship:", helpshipError);
      const errorMessage = helpshipError instanceof Error ? helpshipError.message : "Eroare la punerea comenzii pe hold în Helpship";
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 },
      );
    }

    // Verificăm statusul DUPĂ operație pentru a confirma că a fost setat efectiv pe OnHold
    // Helpship poate returna 200 OK chiar dacă nu a schimbat statusul (ex: comandă anulată)
    console.log(`[Hold] Verifying order status after hold operation...`);

    try {
      const orderStatus = await helpshipClient.getOrderStatus(order.helpship_order_id);

      if (!orderStatus) {
        console.warn(`[Hold] Could not verify order status after hold operation`);
        return NextResponse.json(
          { error: "Nu s-a putut verifica dacă comanda a fost pusă pe hold în Helpship" },
          { status: 500 },
        );
      }

      const statusName = orderStatus.statusName;
      console.log(`[Hold] Order status after hold operation: ${statusName}`);

      // Dacă statusul NU este OnHold după operație, înseamnă că operația a eșuat
      if (statusName !== "OnHold") {
        console.error(`[Hold] Order status is "${statusName}" instead of "OnHold" - operation failed`);
        return NextResponse.json(
          { error: `Comanda nu poate fi pusă pe hold deoarece are statusul "${statusName}" în Helpship. Doar comenzile cu status "Pending" pot fi puse pe hold.` },
          { status: 400 },
        );
      }

      console.log(`[Hold] Order successfully verified as OnHold in Helpship`);
    } catch (verifyError) {
      // Dacă verificarea eșuează, nu continuăm cu update-ul în MVP
      console.error("Failed to verify order status after hold:", verifyError);
      return NextResponse.json(
        { error: "Nu s-a putut verifica statusul comenzii după punerea pe hold" },
        { status: 500 },
      );
    }

    // Salvăm statusul curent înainte de a-l schimba pe "hold"
    const currentStatus = order.status;
    console.log(`[Hold] Saving current status "${currentStatus}" before setting to hold`);

    // Actualizăm statusul în DB la "hold" și salvăm nota
    const updateData: any = {
      status: "hold",
      hold_from_status: currentStatus, // Salvăm statusul pentru UNHOLD
    };

    if (note !== undefined) {
      updateData.order_note = note.trim() || null;
    }

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update(updateData)
      .eq("id", orderId);

    if (updateError) {
      console.error("Failed to update order status in DB:", updateError);
      return NextResponse.json(
        { error: "Failed to update order status" },
        { status: 500 },
      );
    }

    console.log(`[Hold] Order ${orderId} set to hold (was: ${currentStatus}) with note: ${note || "none"}`);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error holding order", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
