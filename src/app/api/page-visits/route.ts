import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { BOT_RE, parseUserAgent } from "@/lib/ua-info";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SID_RE = /^[a-z0-9-]{8,64}$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PageInfo = { organization_id: string; domain_id: string | null; slug: string };
const knownPages = new Map<string, { info: PageInfo; until: number }>();
const PAGE_TTL_MS = 5 * 60 * 1000;

// Only a published page of this system counts as a visit (drafts, other ids and made-up ids are ignored)
async function publishedPage(pageId: string): Promise<PageInfo | null> {
  const cached = knownPages.get(pageId);
  if (cached && cached.until > Date.now()) return cached.info;
  const { data } = await supabaseAdmin
    .from("landing_page_content")
    .select("organization_id, domain_id, slug")
    .eq("id", pageId)
    .eq("status", "published")
    .maybeSingle();
  if (!data) return null;
  const info = data as PageInfo;
  knownPages.set(pageId, { info, until: Date.now() + PAGE_TTL_MS });
  return info;
}

const text = (value: unknown, max = 100): string | null =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;

const whole = (value: unknown, min: number, max: number): number | null => {
  const n = typeof value === "number" ? Math.round(value) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

/**
 * POST /api/page-visits
 * Called with sendBeacon by the tracker of the own pages. Each call upserts the row of one visit (keyed by its random
 * session id): the first call carries the source and device, later calls add the form seen, scroll, time and speed.
 * Public and anonymous; it always answers 204 and never errors out, so it cannot affect the page.
 */
export async function POST(request: NextRequest) {
  const done = () => new Response(null, { status: 204 });
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return done();

    const sid = typeof body.sid === "string" ? body.sid : "";
    const pid = typeof body.pid === "string" ? body.pid : "";
    if (!SID_RE.test(sid) || !UUID_RE.test(pid)) return done();

    const userAgent = request.headers.get("user-agent") || "";
    if (BOT_RE.test(userAgent)) return done();

    const rate = checkRateLimit(`page-visits:${getClientIP(request)}`, { limit: 40, windowSeconds: 60 });
    if (!rate.allowed) return done();

    const page = await publishedPage(pid);
    if (!page) return done();

    const row: Record<string, unknown> = {
      session_id: sid,
      page_id: pid,
      organization_id: page.organization_id,
      domain_id: page.domain_id,
      slug: page.slug,
      updated_at: new Date().toISOString(),
    };

    // First beacon of the visit: where it came from and what it was opened on
    if (body.open === true) {
      const ua = parseUserAgent(userAgent);
      Object.assign(row, {
        utm_source: text(body.us),
        utm_medium: text(body.um),
        utm_campaign: text(body.uc, 200),
        utm_content: text(body.un, 200),
        utm_term: text(body.ut, 200),
        referrer_host: text(body.ref, 100),
        device: ua.device,
        os: ua.os,
        browser: ua.browser,
        in_app: ua.inApp,
        screen_w: whole(body.w, 1, 10000),
      });
    }

    if (body.form === true) row.form_seen = true;
    const scroll = whole(body.sc, 0, 100);
    if (scroll !== null) row.max_scroll = scroll;
    const seconds = whole(body.t, 0, 86400);
    if (seconds !== null) row.time_s = seconds;
    const fcp = whole(body.fcp, 0, 120000);
    if (fcp !== null) row.fcp_ms = fcp;
    const formMs = whole(body.fm, 0, 120000);
    if (formMs !== null) row.form_ms = formMs;
    const errors = whole(body.err, 0, 1000);
    if (errors !== null) row.js_errors = errors;

    const { error } = await supabaseAdmin.from("page_visits").upsert(row, { onConflict: "session_id" });
    if (error) console.error("[Page Visits] save failed:", error.message);
  } catch (error) {
    console.error("[Page Visits] error:", error);
  }
  return done();
}
