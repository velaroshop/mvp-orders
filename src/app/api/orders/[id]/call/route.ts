import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { VapiClient } from "@/lib/vapi";

/**
 * Trigger an AI phone call to the customer for order confirmation.
 * Creates a Vapi outbound call and tracks it in phone_calls table.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const [session, { id: orderId }] = await Promise.all([
      getServerSession(authOptions),
      params,
    ]);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const activeOrganizationId = (session.user as any).activeOrganizationId;

    if (!activeOrganizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 },
      );
    }

    // Fetch order
    const { data: order, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("organization_id", activeOrganizationId)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Validations
    if (order.status !== "pending") {
      return NextResponse.json(
        { error: "Comanda trebuie să fie în status 'pending' pentru a fi apelată" },
        { status: 400 },
      );
    }

    if (order.call_status === "calling") {
      return NextResponse.json(
        { error: "Un apel este deja în curs pentru această comandă" },
        { status: 400 },
      );
    }

    if (order.call_status === "confirmed") {
      return NextResponse.json(
        { error: "Comanda a fost deja confirmată telefonic" },
        { status: 400 },
      );
    }

    // Get Vapi credentials
    const { data: settings } = await supabaseAdmin
      .from("settings")
      .select("vapi_api_key, vapi_phone_number_id, vapi_assistant_id")
      .eq("organization_id", activeOrganizationId)
      .single();

    if (
      !settings?.vapi_api_key ||
      !settings?.vapi_phone_number_id ||
      !settings?.vapi_assistant_id
    ) {
      return NextResponse.json(
        {
          error:
            "Configurația Vapi lipsește. Mergi la Settings pentru a configura API key, Phone Number ID și Assistant ID.",
        },
        { status: 400 },
      );
    }

    // Format phone: 07xxxxxxxx → +407xxxxxxxx
    const customerPhone = order.phone.startsWith("+")
      ? order.phone
      : `+4${order.phone}`;

    // Get brand name from store
    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("order_series")
      .eq("organization_id", activeOrganizationId)
      .limit(1)
      .single();

    const brandName = store?.order_series?.replace(/-$/, "") || "Magazin";

    // Count existing calls for this order to determine attempt number
    const { count: existingCalls } = await supabaseAdmin
      .from("phone_calls")
      .select("id", { count: "exact", head: true })
      .eq("order_id", orderId);

    const attemptNumber = (existingCalls || 0) + 1;

    // Create Vapi call
    const vapiClient = new VapiClient({ apiKey: settings.vapi_api_key });

    const qty = order.product_quantity || 1;
    const productName = order.product_name || "produsul comandat";
    const productDescription =
      qty === 1 ? `o bucată ${productName}` : `${qty} bucăți ${productName}`;

    // Build upsell-aware descriptions
    const upsellsArray = Array.isArray(order.upsells) ? order.upsells : [];
    const hasUpsells = upsellsArray.length > 0;

    // orderDescription: short version for main mention
    // - No upsells: "o bucată crema reparatoare" or "3 bucăți crema reparatoare"
    // - Has upsells: "mai multe produse de pe site-ul nostru"
    const orderDescription = hasUpsells
      ? "mai multe produse de pe site-ul nostru"
      : productDescription;

    // orderDetails: full list for when customer asks "ce am comandat?"
    // Format: "3 bucăți Crema X, la care ați adăugat și o bucată Produs A, o bucată Produs B și o bucată Produs C"
    const formatQty = (name: string, q: number) =>
      q === 1 ? `o bucată ${name}` : `${q} bucăți ${name}`;

    let orderDetails = formatQty(productName, qty);
    if (hasUpsells) {
      const upsellParts = upsellsArray.map((u: Record<string, unknown>) => {
        const uName = (u.title || u.productName || "produs") as string;
        const uQty = Number(u.quantity) || 1;
        return formatQty(uName, uQty);
      });
      // Join with commas, last item with "și"
      const upsellText =
        upsellParts.length === 1
          ? upsellParts[0]
          : `${upsellParts.slice(0, -1).join(", ")} și ${upsellParts[upsellParts.length - 1]}`;
      orderDetails += `, la care ați adăugat și ${upsellText}`;
    }

    const vapiCall = await vapiClient.createOutboundCall({
      phoneNumberId: settings.vapi_phone_number_id,
      assistantId: settings.vapi_assistant_id,
      customerNumber: customerPhone,
      assistantOverrides: {
        variableValues: {
          customerName: order.full_name || "",
          productName: productName,
          productDescription: productDescription,
          orderDescription: orderDescription,
          orderDetails: orderDetails,
          quantity: String(qty),
          total: String(order.total || 0),
          address: order.address || "",
          streetNumber: order.street_number || "",
          city: order.city || "",
          county: order.county || "",
          postalCode: order.postal_code || "",
          orderId: orderId,
          brandName: brandName,
        },
      },
    });

    console.log(
      `[Call] Order ${orderId} - Call created: ${vapiCall.id}, attempt #${attemptNumber}`,
    );

    // Insert phone_calls record
    const { error: insertError } = await supabaseAdmin
      .from("phone_calls")
      .insert({
        organization_id: activeOrganizationId,
        order_id: orderId,
        vapi_call_id: vapiCall.id,
        attempt_number: attemptNumber,
        status: "calling",
        triggered_by: userId,
      });

    if (insertError) {
      console.error("[Call] Failed to insert phone_calls record:", insertError);
    }

    // Update orders table
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        call_status: "calling",
        call_attempts: attemptNumber,
        last_call_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("[Call] Failed to update order:", updateError);
    }

    return NextResponse.json({
      success: true,
      callId: vapiCall.id,
    });
  } catch (error) {
    console.error("[Call] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
