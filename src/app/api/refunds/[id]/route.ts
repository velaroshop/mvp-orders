import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET - Get single refund request
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;
    const activeRole = (session.user as any).activeRole;

    if (!["owner", "admin", "store_manager"].includes(activeRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from("refund_requests")
      .select("*")
      .eq("id", id)
      .eq("organization_id", activeOrganizationId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Refund request not found" }, { status: 404 });
    }

    return NextResponse.json({ refund: data });
  } catch (error) {
    console.error("Error fetching refund:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Update refund request status/notes
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;
    const activeRole = (session.user as any).activeRole;
    const userId = (session.user as any).id;

    if (!["owner", "admin", "store_manager"].includes(activeRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const updateFields: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.status !== undefined) {
      if (!["new", "in_progress", "completed"].includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updateFields.status = body.status;

      if (body.status === "completed") {
        updateFields.resolved_by = userId;
        updateFields.resolved_at = new Date().toISOString();
      }
    }

    if (body.admin_notes !== undefined) {
      updateFields.admin_notes = body.admin_notes;
    }

    const { data, error } = await supabaseAdmin
      .from("refund_requests")
      .update(updateFields)
      .eq("id", id)
      .eq("organization_id", activeOrganizationId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return NextResponse.json({ error: "Refund request not found" }, { status: 404 });
    }

    return NextResponse.json({ refund: data });
  } catch (error) {
    console.error("Error updating refund:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
