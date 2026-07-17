import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET - Get duplicate check days for active organization
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

    const { data } = await supabaseAdmin
      .from("organizations")
      .select("duplicate_check_days")
      .eq("id", activeOrganizationId)
      .single();

    return NextResponse.json({
      duplicate_check_days: (data as any)?.duplicate_check_days || 14,
    });
  } catch (error) {
    console.error("Error fetching duplicate days:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Update duplicate check days
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
    const days = parseInt(body.duplicate_check_days);

    if (!days || days < 1 || days > 365) {
      return NextResponse.json({ error: "Valoarea trebuie sa fie intre 1 si 365" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("organizations")
      .update({ duplicate_check_days: days, updated_at: new Date().toISOString() })
      .eq("id", activeOrganizationId);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving duplicate days:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
