import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const VALID_EVENT_TYPES = [
  "form_loaded",
  "submit_attempt",
  "submit_blocked_validation",
  "submit_sent",
  "submit_success",
  "submit_error",
  "redirect_sent",
] as const;

type EventType = typeof VALID_EVENT_TYPES[number];

/**
 * POST /api/log
 * Public endpoint — called via sendBeacon from widget (no auth).
 * Stores widget lifecycle events in widget_events table for debugging.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const {
      sessionId,
      organizationId,
      landingKey,
      eventType,
      orderId,
      errorMessage,
      errorCode,
      fieldErrors,
      metadata,
    } = body;

    // Basic validation
    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    if (!VALID_EVENT_TYPES.includes(eventType as EventType)) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }

    await supabaseAdmin.from("widget_events").insert({
      session_id: sessionId,
      organization_id: organizationId || null,
      landing_key: landingKey || null,
      event_type: eventType,
      order_id: orderId || null,
      error_message: errorMessage || null,
      error_code: errorCode || null,
      field_errors: fieldErrors || null,
      metadata: metadata || null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Never fail loudly — logging should never break the form
    console.error("[Widget Log] Error saving event:", error);
    return NextResponse.json({ ok: true });
  }
}
