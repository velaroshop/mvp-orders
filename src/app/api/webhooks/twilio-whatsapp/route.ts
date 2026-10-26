import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";

const CONFIRM_PAYLOAD = "confirm_order";
const CONFIRM_REPLY = "Mulțumim! Comanda ta a fost confirmată și o pregătim pentru trimitere. 📦";
const PHONE_FALLBACK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * POST /api/webhooks/twilio-whatsapp
 * Incoming WhatsApp messages from Twilio. Handles the "Confirm comanda" quick reply.
 */
export async function POST(request: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    return new NextResponse("Not configured", { status: 503 });
  }

  const rawBody = await request.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody));

  if (!isValidTwilioSignature(request, params, authToken)) {
    console.warn("[WhatsApp Webhook] Invalid signature");
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (params.ButtonPayload !== CONFIRM_PAYLOAD) {
    return twiml();
  }

  try {
    const orderId = await findOrderId(params.OriginalRepliedMessageSid, params.From);
    if (!orderId) {
      console.warn("[WhatsApp Webhook] No order found for confirmation:", {
        repliedSid: params.OriginalRepliedMessageSid,
      });
      return twiml();
    }

    await supabaseAdmin
      .from("orders")
      .update({ whatsapp_confirmed_at: new Date().toISOString() })
      .eq("id", orderId)
      .is("whatsapp_confirmed_at", null);

    console.log("[WhatsApp Webhook] Order confirmed by customer:", orderId);
    return twiml(CONFIRM_REPLY);
  } catch (err) {
    console.error("[WhatsApp Webhook] Error:", err);
    return twiml();
  }
}

async function findOrderId(repliedSid?: string, from?: string): Promise<string | null> {
  if (repliedSid) {
    const { data } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("whatsapp_message_sid", repliedSid)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  // Fallback: most recent order that got a confirmation message on this phone
  const phoneVariants = from ? storedPhoneVariants(from) : null;
  if (!phoneVariants) return null;

  const { data } = await supabaseAdmin
    .from("orders")
    .select("id")
    .in("phone", phoneVariants)
    .not("whatsapp_message_sid", "is", null)
    .gte("whatsapp_sent_at", new Date(Date.now() - PHONE_FALLBACK_WINDOW_MS).toISOString())
    .order("whatsapp_sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

// "whatsapp:+40712345678" -> ["0712345678", "40712345678", "+40712345678"]
function storedPhoneVariants(from: string): string[] | null {
  const digits = from.replace(/\D/g, "");
  if (!/^407\d{8}$/.test(digits)) return null;
  const national = digits.slice(2);
  return [`0${national}`, `40${national}`, `+40${national}`];
}

function isValidTwilioSignature(
  request: NextRequest,
  params: Record<string, string>,
  authToken: string
): boolean {
  const signature = request.headers.get("x-twilio-signature");
  if (!signature) return false;

  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const { pathname, search } = new URL(request.url);
  const url = `${proto}://${host}${pathname}${search}`;

  const payload = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  const expected = crypto.createHmac("sha1", authToken).update(payload, "utf8").digest("base64");

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function twiml(message?: string) {
  const body = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  return new NextResponse(body, { status: 200, headers: { "Content-Type": "text/xml" } });
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
