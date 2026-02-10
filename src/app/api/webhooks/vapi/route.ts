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
    // Note: analysis & artifact are top-level on message, NOT under message.call
    const call = message.call || {};
    const analysis = message.analysis || {};
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

    const rawStructuredData = analysis.structuredData || {};
    const structuredData = normalizeStructuredData(rawStructuredData);
    const summary = analysis.summary || null;
    const transcript = artifact.transcript || null;
    const recordingUrl = artifact.recordingUrl || null;

    // DEBUG: Dump full message structure to find where Vapi puts structured data
    console.log(`[Vapi Webhook] TOP-LEVEL message keys:`, Object.keys(message));
    console.log(`[Vapi Webhook] message.analysis:`, JSON.stringify(analysis).slice(0, 2000));
    console.log(`[Vapi Webhook] message.artifact keys:`, Object.keys(artifact));
    console.log(`[Vapi Webhook] message.call keys:`, Object.keys(call));
    // Log the full message (truncated) to find structured data location
    console.log(`[Vapi Webhook] FULL MESSAGE:`, JSON.stringify(message).slice(0, 5000));
    // Check specific alternative paths where Vapi might put structured data
    console.log(`[Vapi Webhook] message.structuredData:`, JSON.stringify(message.structuredData));
    console.log(`[Vapi Webhook] artifact.structuredData:`, JSON.stringify(artifact.structuredData));
    console.log(`[Vapi Webhook] call.analysis:`, JSON.stringify(call.analysis));
    console.log(`[Vapi Webhook] message.results:`, JSON.stringify(message.results));
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
    } else if (!transcript && !durationSeconds) {
      // Call "completed" but no transcript and no duration → invalid/unreachable number
      callStatus = "failed";
      console.log(`[Vapi Webhook] No transcript/duration - marking as failed (invalid number)`);
    } else {
      // Call connected - determine result
      // Priority: cancelled > wrong_number > confirmed > needs_review
      callStatus = "completed";
      callResult = determineCallResult(transcript, structuredData);
      console.log(`[Vapi Webhook] Call result: ${callResult}`);
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
        structured_data: structuredData, // normalized flat format
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

// ─── Normalize Vapi structured data ─────────────────────────────────
// Vapi sends structured outputs as UUID-keyed objects:
//   {"uuid1": {"name": "orderConfirmed", "result": true}, "uuid2": {"name": "wantsToCancel", "result": false}}
// We normalize to flat key-value: {"orderConfirmed": true, "wantsToCancel": false}
function normalizeStructuredData(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  // Check if this is already flat format (e.g. {"orderConfirmed": true})
  const values = Object.values(raw);
  const isUuidKeyed = values.length > 0 && values.every(
    (v) => typeof v === "object" && v !== null && "name" in v && "result" in v,
  );

  if (!isUuidKeyed) {
    // Already flat or empty - return as-is
    return raw;
  }

  const normalized: Record<string, unknown> = {};
  for (const value of values) {
    const entry = value as { name: string; result: unknown };
    normalized[entry.name] = entry.result;
  }
  return normalized;
}

// ─── Transcript signal detection ────────────────────────────────────
// Priority order: cancelled > wrong_number > confirmed > needs_review

/** Cancellation: customer wants to cancel, changed their mind, AI confirms cancellation */
const CANCEL_PATTERNS = [
  "vreau să anulez", "vreau sa anulez",
  "să anulez", "sa anulez",
  "anulez comanda",
  "am anulat comanda", "am anulat",
  "nu mai vreau",
  "renunț", "renunt",
  "am răzgândit", "am razgandit",
  "m-am răzgândit", "m-am razgandit",
  "nu doresc",
];

/** Wrong number: customer doesn't recognize order, wrong person, didn't order */
const WRONG_NUMBER_PATTERNS = [
  "nu am comandat", "n-am comandat",
  "nu am făcut", "n-am facut",
  "nicio comandă", "nicio comanda",
  "ați greșit", "ati gresit",
  "greșit numărul", "gresit numarul",
  "număr greșit", "numar gresit",
  "nu e comanda mea",
  "nu sunt eu",
  "nu recunosc",
  "nu știu despre ce", "nu stiu despre ce",
  "nu am cumpărat", "nu am cumparat",
  "n-am cumpărat", "n-am cumparat",
];

/** Hesitancy / soft refusal: customer is unsure or doesn't really want the order */
const HESITANCY_PATTERNS = [
  "mă mai gândesc", "ma mai gandesc",
  "mă gândesc", "ma gandesc",
  "nu sunt sigur", "nu sunt sigură", "nu sunt sigura",
  "nu prea", "nu chiar",
  "nu știu", "nu stiu",
  "las că", "las ca",
  "poate altă dată", "poate alta data",
  "nu acum",
  "mă razgândesc", "ma razgandesc",
  "nu cred",
  "nu vreau", "nu o vreau",
  "nu aș vrea", "nu as vrea",
];

/** AI lines that indicate the assistant asked for ORDER confirmation (not identity) */
const AI_CONFIRMATION_PATTERNS = [
  "confirmați comanda", "confirmati comanda",
  "confirmați această comandă", "confirmati aceasta comanda",
  "doriți să confirmați", "doriti sa confirmati",
  "putem expedia", "o putem expedia",
  "doriți să o expedi", "doriti sa o expedi",
];

/** AI lines that indicate the assistant ACCEPTED the confirmation and is proceeding to ship.
 *  If the AI says these AFTER asking for confirmation, it means the AI understood the customer confirmed.
 *  This is more robust than trying to enumerate all possible customer affirmative words. */
const AI_ACCEPTED_PATTERNS = [
  "comanda va fi expediată", "comanda va fi expediata",
  "va fi expediată", "va fi expediata",
  "o vom expedia", "vom expedia",
  "vă mulțumim", "va multumim",
  "vă dorim o zi", "va dorim o zi",
  "zi bună", "zi buna",
  "am înregistrat comanda", "am inregistrat comanda",
  "am confirmat comanda",
];

function hasSignal(transcript: string, patterns: string[]): boolean {
  const lower = transcript.toLowerCase();
  return patterns.some((p) => lower.includes(p));
}

/**
 * Determine call result from transcript and structured data.
 * Priority: cancelled > wrong_number > confirmed > needs_review
 *
 * Transcript signals ALWAYS override structured data because:
 * - Customer may confirm initially then cancel later
 * - Structured data captures early responses, not final intent
 */
function determineCallResult(
  transcript: string | null,
  structuredData: Record<string, unknown>,
): string {
  console.log("[Vapi Webhook] determineCallResult - transcript is null:", transcript === null);
  console.log("[Vapi Webhook] determineCallResult - transcript length:", transcript?.length);

  // 0. NO USER PARTICIPATION - customer hung up without speaking
  if (transcript) {
    const allLines = transcript.split("\n");
    console.log("[Vapi Webhook] Total lines in transcript:", allLines.length);
    console.log("[Vapi Webhook] First 3 lines:", JSON.stringify(allLines.slice(0, 3)));

    const userLines = allLines
      .filter((line) => line.startsWith("User:"))
      .map((line) => line.replace("User:", "").trim())
      .filter((text) => text.length > 0);

    console.log("[Vapi Webhook] User lines found:", userLines.length, JSON.stringify(userLines));

    if (userLines.length === 0) {
      console.log("[Vapi Webhook] No user lines in transcript - customer hung up");
      return "no_answer";
    }
  }

  // 1. CANCELLED - highest priority, checked on full transcript (including AI lines)
  const hasCancelSignal = transcript && hasSignal(transcript, CANCEL_PATTERNS);
  console.log("[Vapi Webhook] Cancel signal:", hasCancelSignal);
  if (hasCancelSignal) {
    return "cancelled";
  }
  if (structuredData.wantsToCancel === true) {
    console.log("[Vapi Webhook] structuredData.wantsToCancel is true");
    return "cancelled";
  }

  // 2. WRONG NUMBER - customer doesn't recognize order or wrong person
  const hasWrongNumberSignal = transcript && hasSignal(transcript, WRONG_NUMBER_PATTERNS);
  console.log("[Vapi Webhook] Wrong number signal:", hasWrongNumberSignal);
  if (hasWrongNumberSignal) {
    return "wrong_number";
  }
  if (structuredData.orderPlaced === false) {
    console.log("[Vapi Webhook] structuredData.orderPlaced is false");
    return "wrong_number";
  }

  // 3. CONFIRMED - customer confirmed order
  // BUT: if customer shows ANY hesitancy, skip confirmation → needs_review
  const hasHesitancy = transcript && hasSignal(transcript, HESITANCY_PATTERNS);
  console.log("[Vapi Webhook] Hesitancy signal:", hasHesitancy);

  if (hasHesitancy) {
    // Log which pattern matched
    if (transcript) {
      const lower = transcript.toLowerCase();
      const matched = HESITANCY_PATTERNS.find((p) => lower.includes(p));
      console.log("[Vapi Webhook] Hesitancy matched pattern:", JSON.stringify(matched));
    }
    return "needs_review";
  }

  // 3. CONFIRMED - only count affirmatives from AFTER AI asked for order confirmation
  // This prevents "da" from identity check (PASUL 1) being counted as order confirmation
  console.log("[Vapi Webhook] structuredData.orderConfirmed:", structuredData.orderConfirmed);

  if (transcript) {
    const lines = transcript.split("\n");
    let lastConfirmQuestionIdx = -1;

    // Find the LAST AI line that asks for order confirmation
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("AI:")) {
        const lower = lines[i].toLowerCase();
        if (AI_CONFIRMATION_PATTERNS.some((p) => lower.includes(p))) {
          lastConfirmQuestionIdx = i;
        }
      }
    }

    console.log("[Vapi Webhook] Last AI confirmation question at line:", lastConfirmQuestionIdx);

    if (lastConfirmQuestionIdx >= 0) {
      // PRIMARY: Check if AI proceeded to confirm the order (said "comanda va fi expediata" etc.)
      // This is the most robust signal: the AI understood the customer's intent regardless of exact words
      const postConfirmAILines = lines
        .slice(lastConfirmQuestionIdx + 1)
        .filter((line) => line.startsWith("AI:"))
        .map((line) => line.replace("AI:", "").trim().toLowerCase());

      const aiAccepted = postConfirmAILines.some((line) =>
        AI_ACCEPTED_PATTERNS.some((p) => line.includes(p)),
      );

      console.log("[Vapi Webhook] AI accepted (proceeded to ship):", aiAccepted);
      if (aiAccepted) {
        const matchedPattern = AI_ACCEPTED_PATTERNS.find((p) =>
          postConfirmAILines.some((line) => line.includes(p)),
        );
        console.log("[Vapi Webhook] AI accepted matched pattern:", JSON.stringify(matchedPattern));
        return "confirmed";
      }

      // SECONDARY: Check customer's direct affirmative words (fallback if AI didn't say goodbye)
      const postConfirmUserLines = lines
        .slice(lastConfirmQuestionIdx + 1)
        .filter((line) => line.startsWith("User:"))
        .map((line) => line.replace("User:", "").trim().toLowerCase())
        .filter((text) => text.length > 0);

      console.log("[Vapi Webhook] Post-confirmation user lines:", JSON.stringify(postConfirmUserLines));

      if (postConfirmUserLines.length > 0) {
        const affirmativeWords = new Set(["da", "sigur", "corect", "exact", "ok", "bine", "confirm", "confirmez", "desigur", "acord", "perfect", "mergem"]);
        const affirmativePhrases = ["de acord", "sunt de acord"];

        const firstResponse = postConfirmUserLines[0];
        const words = firstResponse.split(/[\s,;.!?]+/).filter(Boolean);
        console.log("[Vapi Webhook] First post-confirm response words:", JSON.stringify(words));

        const hasAffirmative = words.some((w) => affirmativeWords.has(w)) || affirmativePhrases.some((p) => firstResponse.includes(p));
        const hasNegative = words.some((w) => new Set(["nu"]).has(w));

        if (hasAffirmative && !hasNegative) {
          console.log("[Vapi Webhook] Clear affirmative after confirmation question");
          return "confirmed";
        }
      } else {
        console.log("[Vapi Webhook] No user response after confirmation question");
      }
    } else {
      console.log("[Vapi Webhook] AI never asked for order confirmation");
    }

    // TERTIARY: trust structuredData if available
    if (structuredData.orderConfirmed === true) {
      console.log("[Vapi Webhook] structuredData.orderConfirmed=true - confirming");
      return "confirmed";
    }
  }

  // 4. NEEDS REVIEW - fallback
  console.log("[Vapi Webhook] Falling through to needs_review");
  return "needs_review";
}
