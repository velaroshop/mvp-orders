import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { sendMetaPurchaseEvent } from "@/lib/meta-tracking";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TEST_CODE_RE = /^[A-Za-z0-9_-]{3,40}$/;

/**
 * POST /api/orders/[id]/meta-test   Body: { testEventCode }
 * Sends the server-side (Conversions API) Purchase event of a TEST order to Meta as a TEST event, so it shows up in
 * Events Manager > Test Events next to the browser event (same event_id: deduplication can be checked there).
 * SUPERADMIN ONLY. Only orders marked as test, and only with a test event code: it can never send a real purchase.
 * Does not use the organization-wide test mode and does not touch the order flow (finalize, cron).
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user as { activeRole?: string; isSuperadminOrg?: boolean; activeOrganizationId?: string };
    if (user.activeRole !== "owner" || !user.isSuperadminOrg) {
      return NextResponse.json({ error: "Superadmin access required" }, { status: 403 });
    }
    if (!UUID_RE.test(orderId)) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const testEventCode = typeof body.testEventCode === "string" ? body.testEventCode.trim() : "";
    if (!TEST_CODE_RE.test(testEventCode)) {
      return NextResponse.json({ error: "Cod de test invalid. Copiază-l din Events Manager > Test Events (ex. TEST12345)." }, { status: 400 });
    }

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, status, organization_id, landing_key, event_source_url, created_at")
      .eq("id", orderId)
      .eq("organization_id", user.activeOrganizationId ?? "")
      .maybeSingle();
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.status !== "testing") {
      return NextResponse.json({ error: "Doar comenzile marcate ca test pot trimite un eveniment de test." }, { status: 400 });
    }
    if (!order.landing_key) return NextResponse.json({ error: "Comanda nu are landing page." }, { status: 400 });

    const { data: landing } = await supabaseAdmin
      .from("landing_pages")
      .select("fb_pixel_id, fb_conversion_token")
      .eq("slug", order.landing_key)
      .eq("organization_id", order.organization_id)
      .maybeSingle();
    if (!landing?.fb_pixel_id) {
      return NextResponse.json({ error: "Landing page-ul comenzii nu are ID de pixel. Completează-l în editarea landing page-ului." }, { status: 400 });
    }

    // A test landing page usually has no CAPI token: borrow it from another landing page of this organization that uses the same pixel
    let accessToken = landing.fb_conversion_token as string | null;
    if (!accessToken) {
      const { data: sibling } = await supabaseAdmin
        .from("landing_pages")
        .select("fb_conversion_token")
        .eq("organization_id", order.organization_id)
        .eq("fb_pixel_id", landing.fb_pixel_id)
        .not("fb_conversion_token", "is", null)
        .limit(1)
        .maybeSingle();
      accessToken = sibling?.fb_conversion_token ?? null;
    }
    if (!accessToken) {
      return NextResponse.json({ error: "Nu am găsit un token CAPI pentru acest pixel (niciun landing page cu același pixel nu are token)." }, { status: 400 });
    }

    const result = await sendMetaPurchaseEvent({
      orderId,
      pixelId: landing.fb_pixel_id,
      accessToken,
      eventSourceUrl: order.event_source_url || `${process.env.NEXTAUTH_URL || "https://mvp-orders.vercel.app"}/widget`,
      testEventCode,
    });

    if (!result.success) return NextResponse.json({ error: `Meta a refuzat evenimentul: ${result.error}` }, { status: 502 });

    const meta = (result.result ?? {}) as { events_received?: number; fbtrace_id?: string };
    return NextResponse.json({
      success: true,
      eventId: result.eventId,
      eventsReceived: meta.events_received ?? null,
      fbtraceId: meta.fbtrace_id ?? null,
    });
  } catch (error) {
    console.error("[Meta Test] failed:", orderId, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
