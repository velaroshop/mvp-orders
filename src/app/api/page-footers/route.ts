import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSuperadmin } from "@/lib/superadmin-guard";
import { blockDef } from "@/lib/page-block-schemas";
import { parseFooterName } from "@/lib/page-footers-input";

type Row = { id: string; name: string; block: unknown; is_default: boolean; updated_at: string };

/** Number of pages that use each footer: pages that pick it, plus pages on "default footer" for the default one */
async function usageByFooter(organizationId: string, footers: Row[]): Promise<Record<string, number>> {
  const [pages, thankYou] = await Promise.all([
    supabaseAdmin.from("landing_page_content").select("blocks").eq("organization_id", organizationId),
    supabaseAdmin.from("thank_you_page").select("blocks").eq("organization_id", organizationId),
  ]);
  const lists = [...(pages.data ?? []), ...(thankYou.data ?? [])].map((p) => (Array.isArray(p.blocks) ? (p.blocks as Record<string, unknown>[]) : []));

  const usage: Record<string, number> = Object.fromEntries(footers.map((f) => [f.id, 0]));
  const defaultFooter = footers.find((f) => f.is_default);
  for (const blocks of lists) {
    const ids = new Set<string>();
    for (const b of blocks) {
      if (b?.type !== "shared_footer") continue;
      const id = typeof b.footerId === "string" && usage[b.footerId] !== undefined ? b.footerId : defaultFooter?.id;
      if (id) ids.add(id);
    }
    ids.forEach((id) => (usage[id] += 1));
  }
  return usage;
}

/** GET /api/page-footers - footers of the active organization (superadmin only), with how many pages use each */
export async function GET() {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;

  const { data, error } = await supabaseAdmin
    .from("page_footers")
    .select("id, name, block, is_default, updated_at")
    .eq("organization_id", guard.organizationId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[Page Footers] list failed:", error.message);
    return NextResponse.json({ error: "Failed to load footers" }, { status: 500 });
  }

  const footers = (data ?? []) as Row[];
  const usage = await usageByFooter(guard.organizationId, footers);
  return NextResponse.json({ footers: footers.map((f) => ({ ...f, usage: usage[f.id] ?? 0 })) });
}

/** POST /api/page-footers - create a footer. Body: { name, duplicateFrom? }. The first footer becomes the default. */
export async function POST(request: NextRequest) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const name = parseFooterName(body.name);
  if (!name) return NextResponse.json({ error: "Dă un nume footerului" }, { status: 400 });

  let block: unknown = blockDef("footer")?.create() ?? { type: "footer" };
  if (typeof body.duplicateFrom === "string" && body.duplicateFrom) {
    const { data: source } = await supabaseAdmin
      .from("page_footers")
      .select("block")
      .eq("id", body.duplicateFrom)
      .eq("organization_id", guard.organizationId)
      .maybeSingle();
    if (!source) return NextResponse.json({ error: "Footer to duplicate not found" }, { status: 404 });
    block = source.block;
  }

  const { count } = await supabaseAdmin.from("page_footers").select("id", { count: "exact", head: true }).eq("organization_id", guard.organizationId);

  const { data, error } = await supabaseAdmin
    .from("page_footers")
    .insert({ organization_id: guard.organizationId, name, block, is_default: (count ?? 0) === 0 })
    .select("id")
    .single();
  if (error) {
    console.error("[Page Footers] create failed:", error.message);
    return NextResponse.json({ error: "Failed to create footer" }, { status: 500 });
  }
  revalidatePath("/p/[slug]", "page");
  return NextResponse.json({ footer: data }, { status: 201 });
}
