import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// PUT - Update only general settings (not credentials)
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;

    if (!activeOrganizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { duplicateCheckDays } = body;

    // Validate duplicate check days
    if (duplicateCheckDays !== undefined) {
      if (typeof duplicateCheckDays !== "number" || duplicateCheckDays < 1 || duplicateCheckDays > 365) {
        return NextResponse.json(
          { error: "Duplicate check days must be between 1 and 365" },
          { status: 400 },
        );
      }

      // Update duplicate_check_days in organizations table
      const { error } = await supabaseAdmin
        .from("organizations")
        .update({
          duplicate_check_days: duplicateCheckDays,
          updated_at: new Date().toISOString(),
        })
        .eq("id", activeOrganizationId);

      if (error) {
        throw new Error(`Failed to update duplicate check days: ${error.message}`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving general settings", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
