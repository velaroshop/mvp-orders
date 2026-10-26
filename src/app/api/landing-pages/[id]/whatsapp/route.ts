import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { canManageWhatsApp } from "@/lib/whatsapp-confirmation";

/**
 * PATCH /api/landing-pages/[id]/whatsapp
 * Per landing page switch for WhatsApp order confirmations (superadmin org owner only).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = await canManageWhatsApp(session);
    if (!organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: landingPageId } = await params;
    const { enabled } = await request.json();
    if (typeof enabled !== "boolean") {
      return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("landing_pages")
      .update({ whatsapp_confirmation_enabled: enabled })
      .eq("id", landingPageId)
      .eq("organization_id", organizationId)
      .select("id, whatsapp_confirmation_enabled")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }
    if (!data) {
      return NextResponse.json({ error: "Landing page not found" }, { status: 404 });
    }

    return NextResponse.json({ enabled: data.whatsapp_confirmation_enabled });
  } catch (error) {
    console.error("Error in PATCH /api/landing-pages/[id]/whatsapp:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
