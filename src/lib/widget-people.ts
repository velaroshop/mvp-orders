import { supabaseAdmin } from "@/lib/supabase";

const PAGE_SIZE = 1000;
const MAX_ACTION_ROWS = 60000; // everything except form_loaded (about 12% of the events)
const MAX_LOADED_ROWS = 100000; // form_loaded rows read only for the landing, to count loads per page
const PARALLEL_PAGES = 6;

type ActionEvent = { session_id: string; event_type: string; landing_key: string | null; field_errors: Record<string, string> | null };


export interface PeopleFilters {
  organizationId: string | null;
  landingKey: string | null;
  startIso: string | null;
  endIso: string | null;
}

/**
 * The widget events counted per person (unique session) instead of per event: how many opened the form, pressed the
 * button, were blocked by validation and then ordered anyway or left, and the same per landing page.
 * Read-only; the big part (form_loaded) is read as the landing column only.
 */
export async function computePeopleStats({ organizationId, landingKey, startIso, endIso }: PeopleFilters) {
  const base = (columns: string, options?: { count?: "exact"; head?: boolean }) => {
    let q = supabaseAdmin.from("widget_events").select(columns, options);
    if (organizationId && organizationId !== "all") q = q.eq("organization_id", organizationId);
    if (landingKey) q = q.eq("landing_key", landingKey);
    if (startIso) q = q.gte("created_at", startIso);
    if (endIso) q = q.lte("created_at", endIso);
    return q;
  };

  // 1. Everything except form_loaded: the actions of the visitors (small)
  const actions: ActionEvent[] = [];
  let truncated = false;
  for (let offset = 0; ; offset += PAGE_SIZE) {
    if (offset >= MAX_ACTION_ROWS) { truncated = true; break; }
    const { data, error } = await base("session_id, event_type, landing_key, field_errors")
      .neq("event_type", "form_loaded")
      .order("created_at", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    actions.push(...((data ?? []) as unknown as ActionEvent[]));
    if (!data || data.length < PAGE_SIZE) break;
  }

  // 2. Form loads: the total by a count, the split per landing by reading only the landing column in parallel pages
  const { count: loadedTotal } = await base("id", { count: "exact", head: true }).eq("event_type", "form_loaded");
  const loadedTotalN = loadedTotal ?? 0;
  const loadedByLanding = new Map<string, number>();
  const pages = Math.ceil(Math.min(loadedTotalN, MAX_LOADED_ROWS) / PAGE_SIZE);
  if (loadedTotalN > MAX_LOADED_ROWS) truncated = true;
  for (let first = 0; first < pages; first += PARALLEL_PAGES) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(PARALLEL_PAGES, pages - first) }, (_, i) => {
        const offset = (first + i) * PAGE_SIZE;
        return base("landing_key").eq("event_type", "form_loaded").order("created_at", { ascending: true }).range(offset, offset + PAGE_SIZE - 1);
      })
    );
    for (const { data, error } of batch) {
      if (error) throw new Error(error.message);
      for (const row of (data ?? []) as unknown as { landing_key: string | null }[]) {
        const k = row.landing_key || "?";
        loadedByLanding.set(k, (loadedByLanding.get(k) ?? 0) + 1);
      }
    }
  }

  // 3. Per session
  const sessions = new Map<string, { landing: string; pressed: number; blockedEmpty: number; blockedPartial: number; sent: boolean; success: boolean }>();
  for (const e of actions) {
    const s = sessions.get(e.session_id) ?? { landing: e.landing_key || "?", pressed: 0, blockedEmpty: 0, blockedPartial: 0, sent: false, success: false };
    if (s.landing === "?" && e.landing_key) s.landing = e.landing_key;
    if (e.event_type === "submit_attempt") s.pressed += 1;
    if (e.event_type === "submit_blocked_validation") {
      // all five fields missing = the button was pressed on an empty form
      if (e.field_errors && Object.keys(e.field_errors).length >= 5) s.blockedEmpty += 1;
      else s.blockedPartial += 1;
    }
    if (e.event_type === "submit_sent") s.sent = true;
    if (e.event_type === "submit_success") s.success = true;
    sessions.set(e.session_id, s);
  }

  type Row = { landing: string; loaded: number; pressed: number; sent: number; success: number; blocked: number; lost: number };
  const byLanding = new Map<string, Row>();
  const row = (landing: string) => {
    const r = byLanding.get(landing) ?? { landing, loaded: loadedByLanding.get(landing) ?? 0, pressed: 0, sent: 0, success: 0, blocked: 0, lost: 0 };
    byLanding.set(landing, r);
    return r;
  };
  for (const l of loadedByLanding.keys()) row(l);

  const total = { pressed: 0, multiPress: 0, sent: 0, success: 0 };
  const blocked = { sessions: 0, recovered: 0, lost: 0, lostEmptyOnly: 0, lostPartial: 0, emptyEvents: 0, partialEvents: 0 };
  for (const s of sessions.values()) {
    const r = row(s.landing);
    const wasBlocked = s.blockedEmpty + s.blockedPartial > 0;
    if (s.pressed > 0) { total.pressed += 1; r.pressed += 1; }
    if (s.pressed > 1) total.multiPress += 1;
    if (s.sent) { total.sent += 1; r.sent += 1; }
    if (s.success) { total.success += 1; r.success += 1; }
    blocked.emptyEvents += s.blockedEmpty;
    blocked.partialEvents += s.blockedPartial;
    if (wasBlocked) {
      blocked.sessions += 1;
      r.blocked += 1;
      if (s.success) blocked.recovered += 1;
      else {
        blocked.lost += 1;
        r.lost += 1;
        if (s.blockedPartial === 0) blocked.lostEmptyOnly += 1;
        else blocked.lostPartial += 1;
      }
    }
  }

  const data = {
    loaded: loadedTotalN,
    ...total,
    blocked,
    byLanding: [...byLanding.values()].filter((r) => r.loaded > 0 || r.pressed > 0).sort((a, b) => b.lost - a.lost || b.loaded - a.loaded),
    truncated,
  };

  return data;
}
