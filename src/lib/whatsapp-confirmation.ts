import { after } from "next/server";
import { supabaseAdmin } from "./supabase";

const MAX_ORDER_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_PRODUCTS_TEXT = 300;

const DAY_NAMES = ["duminică", "luni", "marți", "miercuri", "joi", "vineri", "sâmbătă"];
const MONTH_NAMES = [
  "ianuarie", "februarie", "martie", "aprilie", "mai", "iunie",
  "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie",
];

interface Line {
  name: string;
  quantity: number;
}

/**
 * Schedules the WhatsApp order confirmation to run after the HTTP response is sent,
 * so it never delays the order flow. Never throws.
 */
export function scheduleOrderConfirmationWhatsApp(order: any, upsells: any[], total: number) {
  const task = () =>
    sendOrderConfirmationWhatsApp(order, upsells, total).catch((err) =>
      console.error("[WhatsApp] Unexpected error:", err)
    );
  try {
    after(task);
  } catch {
    // Outside a request scope after() is unavailable
    void task();
  }
}

async function sendOrderConfirmationWhatsApp(order: any, upsells: any[], total: number) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const contentSid = process.env.TWILIO_WA_ORDER_CONFIRMATION_SID;
  if (!accountSid || !authToken || !from || !contentSid) return;

  if (order.tracking_data?.botSuspected) return;
  if (Date.now() - new Date(order.created_at).getTime() > MAX_ORDER_AGE_MS) return;

  const to = toRomanianMobileE164(order.phone || "");
  if (!to) return;

  if (!(await isEnabledFor(order.organization_id, order.landing_key))) return;

  // Atomic claim: guarantees at most one message per order, even on re-sync or concurrent calls
  const { data: claimed, error: claimError } = await supabaseAdmin
    .from("orders")
    .update({ whatsapp_sent_at: new Date().toISOString() })
    .eq("id", order.id)
    .is("whatsapp_sent_at", null)
    .select("id");

  if (claimError) {
    console.error("[WhatsApp] Claim failed:", claimError.message);
    return;
  }
  if (!claimed || claimed.length === 0) return;

  const now = bucharestNow();
  const variables = {
    "1": greeting(now.hour),
    "2": greetingName(order.full_name || ""),
    "3": formatOrderNumber(order.order_number, order.order_series, order.id),
    "4": truncate(formatProducts(buildLines(order, upsells)), MAX_PRODUCTS_TEXT),
    "5": new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 2 }).format(total),
    "6": deliveryWindow(now),
  };
  const sanitized = Object.fromEntries(
    Object.entries(variables).map(([k, v]) => [k, sanitizeVariable(v)])
  );

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: from,
        To: `whatsapp:${to}`,
        ContentSid: contentSid,
        ContentVariables: JSON.stringify(sanitized),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.sid) {
      throw new Error(`Twilio ${res.status}: ${data.message || "unknown error"}`);
    }

    await supabaseAdmin
      .from("orders")
      .update({ whatsapp_message_sid: data.sid })
      .eq("id", order.id);

    console.log("[WhatsApp] Confirmation sent:", { orderId: order.id, sid: data.sid });
  } catch (err) {
    // whatsapp_sent_at stays set on purpose: a timed-out request may still have been delivered,
    // and a duplicate message to the customer is worse than a missing one.
    console.error("[WhatsApp] Send failed:", { orderId: order.id, error: String(err) });
  }
}

export async function canManageWhatsApp(session: any): Promise<string | null> {
  const user = session?.user as any;
  const organizationId = user?.activeOrganizationId;
  if (!organizationId || user?.activeRole !== "owner") return null;

  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("is_superadmin")
    .eq("id", organizationId)
    .maybeSingle();
  return org?.is_superadmin === true ? organizationId : null;
}

async function isEnabledFor(organizationId: string, landingKey: string): Promise<boolean> {
  const [{ data: org }, { data: settings }, { data: landingPage }] = await Promise.all([
    supabaseAdmin.from("organizations").select("is_superadmin").eq("id", organizationId).maybeSingle(),
    supabaseAdmin
      .from("settings")
      .select("whatsapp_confirmation_enabled")
      .eq("organization_id", organizationId)
      .maybeSingle(),
    supabaseAdmin
      .from("landing_pages")
      .select("whatsapp_confirmation_enabled")
      .eq("organization_id", organizationId)
      .eq("slug", landingKey)
      .maybeSingle(),
  ]);

  return (
    org?.is_superadmin === true &&
    settings?.whatsapp_confirmation_enabled === true &&
    landingPage?.whatsapp_confirmation_enabled === true
  );
}

// Mirrors the order lines sent to Helpship (variations replace the main product)
function buildLines(order: any, upsells: any[]): Line[] {
  const variations = Array.isArray(order.selected_variations)
    ? order.selected_variations.filter((v: any) => Number(v.quantity) > 0)
    : [];

  const mainLines: Line[] =
    variations.length > 0
      ? variations.map((v: any) => ({ name: v.name, quantity: Number(v.quantity) }))
      : [{ name: order.product_name || order.product_sku || "Produs", quantity: Number(order.product_quantity) || 1 }];

  const upsellLines: Line[] = (upsells || []).map((u: any) => ({
    name: u.productName || u.title,
    quantity: Number(u.quantity) || 1,
  }));

  return [...mainLines, ...upsellLines].filter((l) => l.name);
}

function formatProducts(lines: Line[]): string {
  return lines.map((l) => (l.quantity > 1 ? `${l.quantity} x ${l.name}` : l.name)).join(" + ");
}

export function toRomanianMobileE164(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0040")) digits = digits.slice(4);
  else if (digits.startsWith("40")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  return /^7\d{8}$/.test(digits) ? `+40${digits}` : null;
}

function formatOrderNumber(orderNumber?: number | null, orderSeries?: string | null, orderId?: string): string {
  if (!orderNumber) return orderId ? orderId.substring(0, 8) : "-";
  const base = orderSeries || "VLR";
  const series = base.endsWith("-") ? base : `${base}-`;
  return `${series}${String(orderNumber).padStart(5, "0")}`;
}

// Full name on purpose: many customers type the surname first ("Popovici Mariana")
function greetingName(fullName: string): string {
  const name = fullName.trim().replace(/\s+/g, " ");
  if (!name) return "client";
  return name.toLowerCase().replace(/(^|[\s\-'])(\p{L})/gu, (_m, sep, ch) => sep + ch.toUpperCase());
}

function greeting(hour: number): string {
  if (hour >= 5 && hour < 12) return "Bună dimineața";
  if (hour >= 12 && hour < 18) return "Bună ziua";
  return "Bună seara";
}

function bucharestNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour") };
}

// Next two business days, e.g. "joi sau vineri (29-30 octombrie)"
function deliveryWindow(now: { year: number; month: number; day: number }): string {
  const cursor = new Date(Date.UTC(now.year, now.month - 1, now.day, 12));
  const days: Date[] = [];
  while (days.length < 2) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const weekday = cursor.getUTCDay();
    if (weekday !== 0 && weekday !== 6) days.push(new Date(cursor));
  }
  const [a, b] = days;
  const dayPart = `${DAY_NAMES[a.getUTCDay()]} sau ${DAY_NAMES[b.getUTCDay()]}`;
  const datePart =
    a.getUTCMonth() === b.getUTCMonth()
      ? `${a.getUTCDate()}-${b.getUTCDate()} ${MONTH_NAMES[a.getUTCMonth()]}`
      : `${a.getUTCDate()} ${MONTH_NAMES[a.getUTCMonth()]} - ${b.getUTCDate()} ${MONTH_NAMES[b.getUTCMonth()]}`;
  return `${dayPart} (${datePart})`;
}

// WhatsApp rejects template variables containing newlines, tabs or 4+ consecutive spaces
function sanitizeVariable(value: string): string {
  return value.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim() || "-";
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
