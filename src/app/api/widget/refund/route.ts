import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// In-memory rate limiting
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests: number = 5, windowMs: number = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

// POST - Submit a refund request (public, no auth)
export async function POST(request: Request) {
  try {
    // Rate limit by IP
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";

    if (!checkRateLimit(`refund:${ip}`, 5, 60000)) {
      return NextResponse.json(
        { error: "Prea multe cereri. Incearca din nou in cateva minute." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { org_slug, full_name, email, phone, order_number, product_name, motive, description, _hp, _t } = body;

    // Honeypot check — if filled, it's a bot (respond 200 to not tip off)
    if (_hp) {
      return NextResponse.json({ success: true, ticket_number: "OK" });
    }

    // Time check — form filled in under 3 seconds is likely a bot
    if (_t && Date.now() - _t < 3000) {
      return NextResponse.json({ success: true, ticket_number: "OK" });
    }

    // Validate required fields
    if (!org_slug || !full_name || !email || !product_name || !motive) {
      return NextResponse.json(
        { error: "Campuri obligatorii lipsa" },
        { status: 400 }
      );
    }

    // Sanitize: strip HTML tags from all text fields
    const stripHtml = (s: string) => s.replace(/<[^>]*>/g, "");

    const cleanFullName = stripHtml(full_name).trim().slice(0, 50);
    const cleanEmail = email.trim().toLowerCase().slice(0, 50);
    const cleanPhone = phone ? phone.replace(/[^0-9+\s()-]/g, "").slice(0, 15) : null;
    const cleanOrderNumber = order_number ? stripHtml(order_number).trim().slice(0, 50) : null;
    const cleanProductName = stripHtml(product_name).trim().slice(0, 100);
    const cleanMotive = stripHtml(motive).trim().slice(0, 100);
    const cleanDescription = description ? stripHtml(description).trim().slice(0, 2000) : null;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ error: "Adresa de email invalida" }, { status: 400 });
    }

    // Validate phone format (if provided)
    if (cleanPhone && !/^[0-9+\s()-]{6,15}$/.test(cleanPhone)) {
      return NextResponse.json({ error: "Numar de telefon invalid" }, { status: 400 });
    }

    // Get organization by slug
    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("slug", org_slug)
      .eq("is_active", true)
      .single();

    if (orgError || !org) {
      return NextResponse.json({ error: "Organizatie invalida" }, { status: 404 });
    }

    // Get settings for this organization
    const { data: rawSettings } = await supabaseAdmin
      .from("settings")
      .select("*")
      .eq("organization_id", org.id)
      .single();

    const settings = rawSettings as any;

    // Generate ticket number
    const prefix = settings?.refund_ticket_prefix || "RET";
    const currentYear = new Date().getFullYear();
    const currentCounter = (settings?.refund_ticket_counter || 0) + 1;
    const ticketNumber = `${prefix}-${currentYear}-${String(currentCounter).padStart(4, "0")}`;

    // Update counter
    if (settings) {
      await supabaseAdmin
        .from("settings")
        .update({
          refund_ticket_counter: currentCounter,
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", org.id);
    }

    // Create refund request
    const { data: refund, error: insertError } = await supabaseAdmin
      .from("refund_requests")
      .insert({
        organization_id: org.id,
        ticket_number: ticketNumber,
        full_name: cleanFullName,
        email: cleanEmail,
        phone: cleanPhone,
        order_number: cleanOrderNumber,
        product_name: cleanProductName,
        motive: cleanMotive,
        description: cleanDescription,
        status: "new",
        ip_address: ip,
      })
      .select("id, ticket_number")
      .single();

    if (insertError) {
      console.error("Error creating refund request:", insertError);
      return NextResponse.json({ error: "Eroare la salvarea cererii" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      ticket_number: ticketNumber,
    });
  } catch (error) {
    console.error("Error in refund submit:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET - Get form config for a given org slug (public)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orgSlug = searchParams.get("org");

    if (!orgSlug) {
      return NextResponse.json({ error: "Missing org parameter" }, { status: 400 });
    }

    // Get organization
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("id, name")
      .eq("slug", orgSlug)
      .eq("is_active", true)
      .single();

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Get form settings
    const { data: rawFormSettings } = await supabaseAdmin
      .from("settings")
      .select("*")
      .eq("organization_id", org.id)
      .single();

    const settings = rawFormSettings as any;

    return NextResponse.json({
      org_name: org.name,
      form_title: settings?.refund_form_title || "Formular Returnare Produs",
      form_subtitle: settings?.refund_form_subtitle || "",
      motives: settings?.refund_motives || ["Produs defect", "Produs gresit livrat", "Nu corespunde descrierii", "M-am razgandit"],
      terms_url: settings?.refund_terms_url || "",
      primary_color: settings?.refund_primary_color || "#000000",
      logo_url: settings?.refund_logo_url || "",
    });
  } catch (error) {
    console.error("Error fetching refund form config:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
