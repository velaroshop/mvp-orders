import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSuperadmin } from "@/lib/superadmin-guard";
import { bucharestDateKey, bucharestDayEndIso, bucharestDayStartIso, toBucharestParts } from "@/lib/romania-time";
import { isNoiseError } from "@/lib/js-error-noise";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PAGE_SIZE = 1000;
const MAX_ROWS = 50000;

type Visit = {
  created_at: string;
  slug: string;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  referrer_host: string | null;
  device: string | null;
  os: string | null;
  browser: string | null;
  in_app: boolean;
  form_seen: boolean;
  form_started: boolean;
  ordered: boolean;
  max_scroll: number | null;
  time_s: number | null;
  fcp_ms: number | null;
  form_ms: number | null;
  js_errors: number;
  js_error: string | null;
};

type Counts = { visits: number; formSeen: number; started: number; ordered: number };
const empty = (): Counts => ({ visits: 0, formSeen: 0, started: 0, ordered: 0 });
const add = (c: Counts, v: Visit) => {
  c.visits += 1;
  if (v.form_seen) c.formSeen += 1;
  if (v.form_started) c.started += 1;
  if (v.ordered) c.ordered += 1;
};

const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

function group(visits: Visit[], keyOf: (v: Visit) => string) {
  const map = new Map<string, Counts>();
  for (const v of visits) {
    const key = keyOf(v);
    const entry = map.get(key) ?? empty();
    add(entry, v);
    map.set(key, entry);
  }
  return [...map.entries()].map(([key, counts]) => ({ key, ...counts })).sort((a, b) => b.visits - a.visits);
}

/**
 * GET /api/pages-stats?from=YYYY-MM-DD&to=YYYY-MM-DD&slug=<optional> (superadmin only)
 * Funnel and breakdowns of the visits of the own pages, read from page_visits. Days and hours are Romania time.
 */
export async function GET(request: NextRequest) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;

  const { searchParams } = request.nextUrl;
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const slug = searchParams.get("slug") || "";
  if (!DATE_RE.test(from) || !DATE_RE.test(to) || from > to) {
    return NextResponse.json({ error: "Perioadă invalidă" }, { status: 400 });
  }

  const startIso = bucharestDayStartIso(from);
  const endIso = bucharestDayEndIso(to);

  const all: Visit[] = [];
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
    let query = supabaseAdmin
      .from("page_visits")
      .select("created_at, slug, utm_source, utm_campaign, utm_content, referrer_host, device, os, browser, in_app, form_seen, form_started, ordered, max_scroll, time_s, fcp_ms, form_ms, js_errors, js_error")
      .eq("organization_id", guard.organizationId)
      .gte("created_at", startIso)
      .lte("created_at", endIso)
      .order("created_at", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (slug) query = query.eq("slug", slug);
    const { data, error } = await query;
    if (error) {
      console.error("[Pages Stats] query failed:", error.message);
      return NextResponse.json({ error: "Nu am putut citi statisticile. Ai rulat migrările 101 și 102?" }, { status: 500 });
    }
    all.push(...((data ?? []) as Visit[]));
    if (!data || data.length < PAGE_SIZE) break;
  }

  const total = empty();
  all.forEach((v) => add(total, v));

  const sourceOf = (v: Visit) => v.utm_source || v.referrer_host || "direct";
  const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, ...empty() }));
  all.forEach((v) => add(byHour[toBucharestParts(new Date(v.created_at)).hour], v));

  const fcp = all.map((v) => v.fcp_ms).filter((n): n is number => n !== null);
  const formMs = all.map((v) => v.form_ms).filter((n): n is number => n !== null);
  const times = all.map((v) => v.time_s).filter((n): n is number => n !== null);
  const scrolls = all.map((v) => v.max_scroll).filter((n): n is number => n !== null);

  // JS errors: same message grouped, with how many visits and on which browsers
  // (errors that only come from the Facebook / Instagram in-app browser or from other people's scripts are left out, see js-error-noise.ts)
  const realErrors = (v: Visit) => v.js_errors > 0 && !isNoiseError(v.js_error);
  const errorMap = new Map<string, { count: number; browsers: Set<string> }>();
  for (const v of all) {
    if (!realErrors(v)) continue;
    const key = v.js_error || "(mesaj necunoscut)";
    const entry = errorMap.get(key) ?? { count: 0, browsers: new Set<string>() };
    entry.count += 1;
    entry.browsers.add([v.os ?? "?", v.in_app ? `${v.browser} (aplicație)` : v.browser ?? "?"].join(" · "));
    errorMap.set(key, entry);
  }
  const errors = [...errorMap.entries()]
    .map(([message, e]) => ({ message, count: e.count, browsers: [...e.browsers].slice(0, 4) }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    total,
    byPage: group(all, (v) => v.slug),
    byDay: group(all, (v) => bucharestDateKey(new Date(v.created_at))).sort((a, b) => (a.key < b.key ? 1 : -1)),
    bySource: group(all, sourceOf),
    byCampaign: group(all, (v) => (v.utm_campaign ? `${sourceOf(v)} / ${v.utm_campaign}${v.utm_content ? ` / ${v.utm_content}` : ""}` : "(fără campanie)")),
    byDevice: group(all, (v) => [v.device ?? "?", v.os ?? "?", v.in_app ? `${v.browser} (aplicație)` : v.browser ?? "?"].join(" · ")),
    byHour,
    speed: {
      fcpMedianMs: median(fcp),
      formMedianMs: median(formMs),
      timeMedianS: median(times),
      scrollMedian: median(scrolls),
      visitsWithErrors: all.filter(realErrors).length,
    },
    errors,
    truncated: all.length >= MAX_ROWS,
  });
}
