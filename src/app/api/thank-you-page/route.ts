import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSuperadmin } from "@/lib/superadmin-guard";
import { parseBackground, parseBlocksInput } from "@/lib/own-page-input";
import { DEFAULT_THANK_YOU } from "@/lib/thank-you-default";

/** GET /api/thank-you-page - the organization's saved thank-you page, or the built-in default */
export async function GET() {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;

  const { data, error } = await supabaseAdmin
    .from("thank_you_page")
    .select("background, blocks, updated_at")
    .eq("organization_id", guard.organizationId)
    .maybeSingle();

  // Table not created yet: behave as "nothing saved" so the editor still opens on the default
  if (error) console.error("[Thank You Page] load failed:", error.message);

  if (data) return NextResponse.json({ page: data, isDefault: false });
  return NextResponse.json({
    page: { background: DEFAULT_THANK_YOU.background, blocks: DEFAULT_THANK_YOU.blocks, updated_at: null },
    isDefault: true,
  });
}

/** PUT /api/thank-you-page - save (one page per organization). Body: { background?, blocks } */
export async function PUT(request: NextRequest) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const parsed = parseBlocksInput(body.blocks);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("thank_you_page")
    .upsert(
      {
        organization_id: guard.organizationId,
        background: parseBackground(body.background),
        blocks: parsed.blocks,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id" },
    )
    .select("background, blocks, updated_at")
    .single();

  if (error) {
    console.error("[Thank You Page] save failed:", error.message);
    return NextResponse.json({ error: "Failed to save page" }, { status: 500 });
  }
  return NextResponse.json({ page: data, isDefault: false });
}

/** DELETE /api/thank-you-page - go back to the built-in default */
export async function DELETE() {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;

  const { error } = await supabaseAdmin.from("thank_you_page").delete().eq("organization_id", guard.organizationId);
  if (error) return NextResponse.json({ error: "Failed to reset page" }, { status: 500 });
  return NextResponse.json({ success: true });
}
