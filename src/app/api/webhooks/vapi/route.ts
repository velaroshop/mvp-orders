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
      // Call connected - determine result
      callStatus = "completed";

      // ALWAYS check transcript for cancellation first (overrides structuredData)
      // Customer may confirm initially then change their mind later in the call
      const transcriptCancelled = transcript ? hasCancellationSignal(transcript) : false;

      if (transcriptCancelled) {
        callResult = "cancelled";
        console.log(`[Vapi Webhook] Cancellation detected in transcript`);
      } else {
        const hasStructuredData = Object.keys(structuredData).length > 0;

        if (hasStructuredData) {
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
        } else if (transcript) {
          callResult = analyzeTranscript(transcript);
          console.log(`[Vapi Webhook] Transcript fallback result: ${callResult}`);
        } else {
          callResult = "needs_review";
        }
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

const CANCEL_PATTERNS = [
  "vreau să anulez",
  "vreau sa anulez",
  "să anulez",
  "sa anulez",
  "anulez comanda",
  "am anulat comanda",
  "am anulat",
  "nu mai vreau",
  "renunț",
  "renunt",
  "am răzgândit",
  "am razgandit",
  "m-am răzgândit",
  "m-am razgandit",
  "nu doresc",
];

/**
 * Check if transcript contains cancellation signals.
 * Runs BEFORE structured data check to catch cases where customer
 * initially confirms but then changes their mind later in the call.
 */
function hasCancellationSignal(transcript: string): boolean {
  const lower = transcript.toLowerCase();
  return CANCEL_PATTERNS.some((pattern) => lower.includes(pattern));
}

/**
 * Fallback transcript analysis when Vapi structured outputs are empty.
 * Parses user responses to determine if order was confirmed or cancelled.
 */
function analyzeTranscript(transcript: string): string {
  const lower = transcript.toLowerCase();

  // Check for cancellation signals
  if (hasCancellationSignal(transcript)) return "cancelled";

  // Extract user lines only
  const userLines = transcript
    .split("\n")
    .filter((line) => line.startsWith("User:"))
    .map((line) => line.replace("User:", "").trim().toLowerCase());

  if (userLines.length === 0) return "needs_review";

  // Tokenize each line into words (strip punctuation from each word)
  function getWords(line: string): string[] {
    return line.split(/[\s,;.!?]+/).filter(Boolean);
  }

  // Count affirmative vs negative responses by checking individual words
  const affirmativeWords = new Set(["da", "sigur", "corect", "exact", "ok", "bine"]);
  const negativeWords = new Set(["nu"]);

  let yesCount = 0;
  let noCount = 0;

  for (const line of userLines) {
    const words = getWords(line);
    const hasYes = words.some((w) => affirmativeWords.has(w));
    const hasNo = words.some((w) => negativeWords.has(w));
    if (hasYes) yesCount++;
    if (hasNo) noCount++;
  }

  // Detect address correction: user provides address components
  // Look for patterns like "strada X", "numărul Y", "din Z", "județul W"
  const addressCorrectionPatterns = [
    "altă adresă", "alta adresa", "arta este adres",
    "e greșită", "e gresita", "nu e corect",
    "altă stradă", "alta strada",
  ];
  const hasExplicitCorrection = addressCorrectionPatterns.some((p) =>
    lower.includes(p),
  );

  // Detect user giving a new address (street, number, city, county in user lines)
  const addressGivingPatterns = [
    /strada\s+\w/i,
    /str\.\s*\w/i,
    /num[aă]rul\s+\d/i,
    /nr\.\s*\d/i,
    /jude[tț]ul\s+\w/i,
    /din\s+\w+.*jude[tț]/i,
  ];
  const userGaveAddress = userLines.some((line) =>
    addressGivingPatterns.some((rx) => rx.test(line)),
  );

  const hasAddressCorrection = hasExplicitCorrection || userGaveAddress;

  // Address was corrected and customer confirmed at the end
  if (hasAddressCorrection && yesCount >= 1) return "address_corrected";

  // If customer mostly said yes → confirmed
  if (yesCount >= 2 && noCount === 0) return "confirmed";
  if (yesCount > noCount && yesCount >= 2) return "confirmed";

  return "needs_review";
}
