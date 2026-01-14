import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

// Use service role key for API routes to bypass RLS
// We still validate organization_id from session
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
    },
  }
);

/**
 * PATCH /api/landing-pages/[id]/status - Update landing page status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.activeOrganizationId) {
      return NextResponse.json(
        { error: "Unauthorized - No active organization" },
        { status: 401 }
      );
    }

    const { id: landingPageId } = await params;
    const organizationId = session.user.activeOrganizationId;
    const body = await request.json();

    const { status } = body;

    // Validate status
    if (!status || !["draft", "published", "archived"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'draft', 'published', or 'archived'" },
        { status: 400 }
      );
    }

    // Verify the landing page belongs to the user's organization
    const { data: existingPage, error: fetchError } = await supabase
      .from("landing_pages")
      .select("id, organization_id")
      .eq("id", landingPageId)
      .single();

    if (fetchError || !existingPage) {
      return NextResponse.json(
        { error: "Landing page not found" },
        { status: 404 }
      );
    }

    if (existingPage.organization_id !== organizationId) {
      return NextResponse.json(
        { error: "Unauthorized - Landing page does not belong to your organization" },
        { status: 403 }
      );
    }

    // Update the status
    const { data: landingPage, error } = await supabase
      .from("landing_pages")
      .update({ status })
      .eq("id", landingPageId)
      .select()
      .single();

    if (error) {
      console.error("Error updating landing page status:", error);
      return NextResponse.json(
        { error: "Failed to update landing page status", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ landingPage });
  } catch (error) {
    console.error("Error in PATCH /api/landing-pages/[id]/status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
