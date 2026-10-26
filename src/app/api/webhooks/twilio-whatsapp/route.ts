import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";

const CONFIRM_PAYLOAD = "confirm_order";
const CONFIRM_REPLY = "Mulțumim! Comanda ta a fost confirmată și o pregătim pentru trimitere. 📦";
const TEXT_REPLY_ACK = "Am primit mesajul tău. Dacă e nevoie, un coleg te contactează în scurt timp. 🙏";
const PHONE_FALLBACK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const ACK_COOLDOWN_MS = 60 * 60 * 1000;
const REPLY_MAX_LENGTH = 1000;

/**
 * POST /api/webhooks/twilio-whatsapp
 * Incoming WhatsApp messages from Twilio: the "Confirm comanda" quick reply and free-text replies.
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

  try {
    const orderId = await findOrderId(params.OriginalRepliedMessageSid, params.From);
    if (!orderId) {
      console.warn("[WhatsApp Webhook] No order found for incoming message:", {
        repliedSid: params.OriginalRepliedMessageSid,
      });
      return twiml();
    }

    if (params.ButtonPayload === CONFIRM_PAYLOAD) {
      await supabaseAdmin
        .from("orders")
        .update({ whatsapp_confirmed_at: new Date().toISOString() })
        .eq("id", orderId)
        .is("whatsapp_confirmed_at", null);

      console.log("[WhatsApp Webhook] Order confirmed by customer:", orderId);
      return twiml(CONFIRM_REPLY);
    }

    const text = describeMessage(params);
    if (!text) return twiml();

    const shouldAck = await saveReply(orderId, text);
    console.log("[WhatsApp Webhook] Customer reply saved:", orderId);
    return twiml(shouldAck ? TEXT_REPLY_ACK : undefined);
  } catch (err) {
    console.error("[WhatsApp Webhook] Error:", err);
    return twiml();
  }
}

// Text, voice notes and media; voice notes are common with this audience
function describeMessage(params: Record<string, string>): string | null {
  const body = (params.Body || params.ButtonText || "").trim();
  let media = "";
  if (Number(params.NumMedia || 0) > 0) {
    const type = params.MediaContentType0 || "";
    media = type.startsWith("audio/")
      ? "🎤 Mesaj vocal"
      : type.startsWith("image/")
      ? "📷 Imagine"
      : type.startsWith("video/")
      ? "🎥 Video"
      : "📎 Fișier";
  }
  const text = [media, body].filter(Boolean).join(" ");
  return text || null;
}

// Appends the reply to the order; returns whether to send the auto-acknowledgement
async function saveReply(orderId: string, text: string): Promise<boolean> {
  const { data: current, error } = await supabaseAdmin
    .from("orders")
    .select("whatsapp_reply, whatsapp_reply_at")
    .eq("id", orderId)
    .maybeSingle();
  if (error) {
    console.error("[WhatsApp Webhook] Reading reply failed:", error.message);
    return false;
  }

  const combined = current?.whatsapp_reply ? `${current.whatsapp_reply}\n${text}` : text;
  const { error: updateError } = await supabaseAdmin
    .from("orders")
    .update({
      whatsapp_reply: combined.slice(-REPLY_MAX_LENGTH),
      whatsapp_reply_at: new Date().toISOString(),
    })
    .eq("id", orderId);
  if (updateError) {
    console.error("[WhatsApp Webhook] Saving reply failed:", updateError.message);
    return false;
  }

  const lastReplyAt = current?.whatsapp_reply_at ? new Date(current.whatsapp_reply_at).getTime() : 0;
  return Date.now() - lastReplyAt > ACK_COOLDOWN_MS;
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
