import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Vapi webhook endpoint - receives call results.
 * Public endpoint (no session auth) - verified by vapi_call_id lookup.
 * Docs: https://docs.vapi.ai/server-url/events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    // Vapi sends various message types; we only process end-of-call-report
    if (message?.type !== "end-of-call-report") {
      return NextResponse.json({ received: true });
    }

    const callId = message.call?.id;
    if (!callId) {
      console.error("[Vapi Webhook] No call ID in end-of-call-report");
      return NextResponse.json({ error: "Missing call ID" }, { status: 400 });
    }

    console.log(`[Vapi Webhook] Processing call ${callId}`);

    // Find phone_calls record
    const { data: phoneCall, error: findError } = await supabaseAdmin
      .from("phone_calls")
      .select("id, order_id, organization_id")
      .eq("vapi_call_id", callId)
      .single();

    if (findError || !phoneCall) {
      console.error(
        `[Vapi Webhook] Record not found for vapi_call_id: ${callId}`,
      );
      return NextResponse.json(
        { error: "Call record not found" },
        { status: 404 },
      );
    }

    // Extract data from webhook payload
    const call = message.call || {};
    const analysis = call.analysis || {};
    const artifact = message.artifact || {};
    const endedReason = message.endedReason || call.endedReason;

    // Duration
    const startTime = call.startedAt
      ? new Date(call.startedAt).getTime()
      : null;
    const endTime = call.endedAt ? new Date(call.endedAt).getTime() : null;
    const durationSeconds =
      startTime && endTime
        ? Math.round((endTime - startTime) / 1000)
        : null;

    const structuredData = analysis.structuredData || {};
    const summary = analysis.summary || null;
    const transcript = artifact.transcript || null;
    const recordingUrl = artifact.recordingUrl || null;
    const cost = call.cost || null;

    // Determine call status and result
    let callStatus: string;
    let callResult: string | null = null;

    if (
      endedReason === "customer-did-not-answer" ||
      endedReason === "voicemail"
    ) {
      callStatus = "no_answer";
    } else if (
      endedReason === "phone-call-provider-error" ||
      endedReason === "customer-busy"
    ) {
      callStatus = "failed";
    } else if (endedReason === "assistant-error") {
      callStatus = "failed";
    } else {
      // Call connected - determine result from structuredData
      callStatus = "completed";

      if (structuredData.orderConfirmed === true) {
        if (
          structuredData.addressCorrect === false &&
          structuredData.correctedAddress
        ) {
          callResult = "address_corrected";
        } else {
          callResult = "confirmed";
        }
      } else if (structuredData.wantsToCancel === true) {
        callResult = "cancelled";
      } else {
        callResult = "needs_review";
      }
    }

    // Update phone_calls record
    const { error: updateCallError } = await supabaseAdmin
      .from("phone_calls")
      .update({
        status: callStatus,
        result: callResult,
        duration_seconds: durationSeconds,
        transcript: transcript,
        summary: summary,
        structured_data: structuredData,
        recording_url: recordingUrl,
        cost: cost,
        ended_at: new Date().toISOString(),
      })
      .eq("id", phoneCall.id);

    if (updateCallError) {
      console.error("[Vapi Webhook] Failed to update phone_calls:", updateCallError);
    }

    // Update orders table
    const orderCallStatus = callResult || callStatus;

    const { error: updateOrderError } = await supabaseAdmin
      .from("orders")
      .update({
        call_status: orderCallStatus,
        last_call_at: new Date().toISOString(),
      })
      .eq("id", phoneCall.order_id);

    if (updateOrderError) {
      console.error("[Vapi Webhook] Failed to update order:", updateOrderError);
    }

    console.log(
      `[Vapi Webhook] Call ${callId}: status=${callStatus}, result=${callResult}`,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Vapi Webhook] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
