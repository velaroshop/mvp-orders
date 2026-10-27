import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";

const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,79}$/i;
const SID_RE = /^[a-z0-9]{8,40}$/i;
const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pagespeed|gtmetrix|python|curl|wget/i;
const IN_APP_RE = /FBAN|FBAV|FB_IAB|Instagram|TikTok|musical_ly|Snapchat/i;

const knownSlugs = new Map<string, number>();
const SLUG_TTL_MS = 10 * 60 * 1000;

async function slugExists(slug: string): Promise<boolean> {
  const cached = knownSlugs.get(slug);
  if (cached && cached > Date.now()) return true;

  const { data } = await supabaseAdmin
    .from("landing_pages")
    .select("id")
    .eq("slug", slug)
    .limit(1);
  if (data && data.length > 0) {
    knownSlugs.set(slug, Date.now() + SLUG_TTL_MS);
    return true;
  }
  return false;
}

function image() {
  return new Response(GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, max-age=0",
      "Content-Length": String(GIF.length),
    },
  });
}

/**
 * GET /api/log/page-seen?lp=<slug>&sid=<id>&v=<visibility>&w=<screen width>&c=<connection>
 * Image beacon: lets a tiny inline snippet on a sales page report that the page was seen,
 * independently of embed.js. Always answers with a 1x1 GIF so it can never affect the page.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("lp") || "";
    const sid = searchParams.get("sid") || "";
    if (!SLUG_RE.test(slug) || !SID_RE.test(sid)) return image();

    const rate = checkRateLimit(`page-seen:${getClientIP(request)}`, { limit: 60, windowSeconds: 60 });
    if (!rate.allowed) return image();

    if (!(await slugExists(slug))) return image();

    const userAgent = request.headers.get("user-agent") || "";
    await supabaseAdmin.from("widget_events").insert({
      session_id: sid,
      landing_key: slug,
      event_type: "page_seen",
      metadata: {
        ua: userAgent.slice(0, 200),
        bot: BOT_RE.test(userAgent),
        inApp: IN_APP_RE.test(userAgent),
        visible: searchParams.get("v") === "visible",
        width: Number(searchParams.get("w")) || null,
        connection: (searchParams.get("c") || "").slice(0, 10) || null,
      },
    });
  } catch (error) {
    console.error("[PageSeen] Error:", error);
  }
  return image();
}
