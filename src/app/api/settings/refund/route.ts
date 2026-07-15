import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET - Retrieve refund settings for active organization
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;
    if (!activeOrganizationId) {
      return NextResponse.json({ error: "No active organization" }, { status: 400 });
    }

    // Also get the org slug for iframe URL
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("slug")
      .eq("id", activeOrganizationId)
      .single();

    const { data: rawData, error } = await supabaseAdmin
      .from("settings")
      .select("*")
      .eq("organization_id", activeOrganizationId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(`Failed to fetch refund settings: ${error.message}`);
    }

    const data = rawData as any;
    const currentYear = new Date().getFullYear();
    const prefix = data?.refund_ticket_prefix || "RET";
    const counter = (data?.refund_ticket_counter || 0) + 1;
    const nextTicketPreview = `${prefix}-${currentYear}-${String(counter).padStart(4, "0")}`;

    return NextResponse.json({
      settings: {
        refund_ticket_prefix: data?.refund_ticket_prefix || "RET",
        refund_form_title: data?.refund_form_title || "Formular Returnare Produs",
        refund_form_subtitle: data?.refund_form_subtitle || "",
        refund_motives: data?.refund_motives || ["Produs defect", "Produs gresit livrat", "Nu corespunde descrierii", "M-am razgandit"],
        refund_terms_url: data?.refund_terms_url || "",
        refund_primary_color: data?.refund_primary_color || "#000000",
        refund_logo_url: data?.refund_logo_url || "",
        next_ticket_preview: nextTicketPreview,
        org_slug: org?.slug || "",
      },
    });
  } catch (error) {
    console.error("Error fetching refund settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Update refund settings
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;
    const activeRole = (session.user as any).activeRole;

    if (!activeOrganizationId) {
      return NextResponse.json({ error: "No active organization" }, { status: 400 });
    }

    if (!["owner", "admin"].includes(activeRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const updateFields: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // Only update fields that are provided
    if (body.refund_ticket_prefix !== undefined) {
      // Validate: exactly 3 uppercase letters
      const prefix = body.refund_ticket_prefix.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
      if (prefix.length !== 3) {
        return NextResponse.json({ error: "Ticket prefix must be exactly 3 letters" }, { status: 400 });
      }
      updateFields.refund_ticket_prefix = prefix;
    }
    if (body.refund_form_title !== undefined) updateFields.refund_form_title = body.refund_form_title;
    if (body.refund_form_subtitle !== undefined) updateFields.refund_form_subtitle = body.refund_form_subtitle;
    if (body.refund_motives !== undefined) {
      if (!Array.isArray(body.refund_motives) || body.refund_motives.length === 0) {
        return NextResponse.json({ error: "At least one motive is required" }, { status: 400 });
      }
      updateFields.refund_motives = body.refund_motives;
    }
    if (body.refund_terms_url !== undefined) updateFields.refund_terms_url = body.refund_terms_url;
    if (body.refund_primary_color !== undefined) updateFields.refund_primary_color = body.refund_primary_color;
    if (body.refund_logo_url !== undefined) updateFields.refund_logo_url = body.refund_logo_url;

    // Check if settings exist
    const { data: existing } = await supabaseAdmin
      .from("settings")
      .select("id")
      .eq("organization_id", activeOrganizationId)
      .single();

    if (existing) {
      const { error } = await supabaseAdmin
        .from("settings")
        .update(updateFields)
        .eq("organization_id", activeOrganizationId);

      if (error) throw new Error(`Failed to update refund settings: ${error.message}`);
    } else {
      const { error } = await supabaseAdmin
        .from("settings")
        .insert({ organization_id: activeOrganizationId, ...updateFields });

      if (error) throw new Error(`Failed to create refund settings: ${error.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving refund settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
