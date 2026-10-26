import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { canManageWhatsApp } from "@/lib/whatsapp-confirmation";

/**
 * PUT /api/settings/whatsapp
 * Master switch for WhatsApp order confirmations (superadmin org owner only).
 */
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = await canManageWhatsApp(session);
    if (!organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { enabled } = await request.json();
    if (typeof enabled !== "boolean") {
      return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from("settings")
      .select("id")
      .eq("organization_id", organizationId)
      .maybeSingle();

    const updateData = {
      whatsapp_confirmation_enabled: enabled,
      updated_at: new Date().toISOString(),
    };

    const { error } = existing
      ? await supabaseAdmin.from("settings").update(updateData).eq("organization_id", organizationId)
      : await supabaseAdmin.from("settings").insert({ organization_id: organizationId, ...updateData });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving WhatsApp settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
