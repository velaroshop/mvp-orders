import { supabaseAdmin } from "@/lib/supabase";
import { bucharestDateKey, shiftDateKey } from "@/lib/romania-time";
import { buildAds, fetchAdsVisits } from "@/lib/pages-ads";
import { loadBreakEven } from "@/lib/break-even-data";

// Daily email with what to scale, watch or stop. Periods end yesterday (closed days): the report is sent in the
// morning, when yesterday's spend and orders are final and today's are still partial.

type AdsResult = Awaited<ReturnType<typeof buildAds>>;
type Campaign = Extract<AdsResult, { connected: true }>["campaigns"][number];
type AdRow = Extract<AdsResult, { connected: true }>["rows"][number];

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const lei = (n: number) => `${Math.round(n).toLocaleString("ro-RO")} lei`;
const dayLabel = (key: string, long = false) =>
  new Date(`${key}T12:00:00Z`).toLocaleDateString("ro-RO", long ? { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" } : { day: "numeric", month: "short", timeZone: "UTC" });

const COLORS = {
  scale: { main: "#047857", soft: "#ecfdf5", border: "#a7f3d0" },
  stop: { main: "#b91c1c", soft: "#fef2f2", border: "#fecaca" },
  watch: { main: "#b45309", soft: "#fffbeb", border: "#fde68a" },
  info: { main: "#334155", soft: "#f8fafc", border: "#e2e8f0" },
};

function pctText(n: number | null) {
  return n === null ? "" : `${n > 0 ? "+" : ""}${n}%`;
}

function trendHtml(c: Campaign) {
  if (!c.trend || c.trendPct === null) return "";
  const color = c.trend === "better" ? "#047857" : c.trend === "worse" ? "#b91c1c" : "#64748b";
  const text = c.trend === "better" ? "▲ mai bun" : c.trend === "worse" ? "▼ mai slab" : "≈ la fel";
  return `<span style="color:${color};font-weight:600;">${text}</span> <span style="color:#64748b;">(CPA ${pctText(c.trendPct)} față de săptămâna dinainte)</span>`;
}

function recent3Text(c: Campaign) {
  if (!c.recent3) return "";
  const cpa = c.recent3.orders > 0 ? c.recent3.spend / c.recent3.orders : null;
  const bad = c.cpaMax !== null && (cpa === null ? c.recent3.spend >= c.cpaMax : cpa > c.cpaMax);
  return `<span style="color:${bad ? "#b91c1c" : "#334155"};">Ultimele 3 zile: ${lei(c.recent3.spend)} · ${c.recent3.orders} ${c.recent3.orders === 1 ? "comandă" : "comenzi"} · CPA ${cpa === null ? "–" : lei(cpa)}</span>`;
}

/** Budget step suggested for a campaign that can be scaled: a bigger margin under the scale threshold allows a bigger step. */
function budgetStep(c: Campaign): string {
  if (c.cpa === null || c.scaleBelow === null || c.scaleBelow <= 0) return "+20%";
  return c.cpa <= c.scaleBelow * 0.8 ? "+30%" : "+20%";
}

function card(c: Campaign, tone: keyof typeof COLORS, extra = "") {
  const t = COLORS[tone];
  const cpaLine = c.cpa === null ? "fără comenzi" : `CPA ${lei(c.cpa)}`;
  return `
  <tr><td style="padding:0 0 10px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${t.border};border-left:4px solid ${t.main};border-radius:10px;background:${t.soft};">
      <tr><td style="padding:14px 16px;">
        <div style="font-size:15px;font-weight:700;color:#0f172a;">${esc(c.name)}</div>
        <div style="font-size:12px;color:#64748b;margin:2px 0 10px;">${esc(c.product ?? c.slug)} · pagina /${esc(c.slug)} · ${c.adCount} ${c.adCount === 1 ? "reclamă" : "reclame"}</div>
        <table cellpadding="0" cellspacing="0" style="margin-bottom:10px;"><tr>
          <td style="padding-right:22px;"><div style="font-size:11px;color:#64748b;text-transform:uppercase;">Cheltuit</div><div style="font-size:16px;font-weight:700;color:#0f172a;">${lei(c.spend)}</div></td>
          <td style="padding-right:22px;"><div style="font-size:11px;color:#64748b;text-transform:uppercase;">Comenzi</div><div style="font-size:16px;font-weight:700;color:#0f172a;">${c.ordered}</div></td>
          <td style="padding-right:22px;"><div style="font-size:11px;color:#64748b;text-transform:uppercase;">CPA</div><div style="font-size:16px;font-weight:700;color:${t.main};">${c.cpa === null ? "–" : lei(c.cpa)}</div></td>
          <td><div style="font-size:11px;color:#64748b;text-transform:uppercase;">Prag scalare / maxim</div><div style="font-size:16px;font-weight:700;color:#0f172a;">${c.scaleBelow ?? "–"} / ${c.cpaMax ?? "–"}</div></td>
        </tr></table>
        <div style="font-size:13px;color:#1e293b;line-height:1.5;">${esc(c.verdict.reason)}</div>
        <div style="font-size:12px;line-height:1.6;margin-top:6px;">${recent3Text(c)}${recent3Text(c) && trendHtml(c) ? "<br/>" : ""}${trendHtml(c)}</div>
        ${extra}
      </td></tr>
    </table>
  </td></tr>`;
}

function section(title: string, subtitle: string, tone: keyof typeof COLORS, body: string) {
  return `
  <tr><td style="padding:22px 0 8px;">
    <div style="font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${COLORS[tone].main};">${esc(title)}</div>
    <div style="font-size:13px;color:#64748b;margin-top:2px;">${esc(subtitle)}</div>
  </td></tr>
  ${body}`;
}

function bullets(items: string[]) {
  return items.map((i) => `<li style="margin:0 0 7px;">${i}</li>`).join("");
}

export interface AdsDigest {
  subject: string;
  html: string;
  counts: { scale: number; watch: number; stop: number };
}

export async function buildAdsDigest(organizationId: string, now = new Date()): Promise<AdsDigest> {
  const today = bucharestDateKey(now);
  const to = shiftDateKey(today, -1);
  const from = shiftDateKey(to, -6);
  const from3 = shiftDateKey(to, -2);
  const base = (process.env.NEXTAUTH_URL || "https://app.ecom-society.com").replace(/\/$/, "");
  const statsUrl = `${base}/admin/pages/stats`;

  const [visits, breakEven, settings] = await Promise.all([
    fetchAdsVisits(organizationId, from, to),
    loadBreakEven(organizationId).catch(() => null),
    supabaseAdmin.from("settings").select("meta_ads_token_expires_at").eq("organization_id", organizationId).maybeSingle(),
  ]);
  const ads = await buildAds(organizationId, from, to, visits);

  const tokenExpires = settings.data?.meta_ads_token_expires_at ? new Date(settings.data.meta_ads_token_expires_at as string) : null;
  const daysToExpiry = tokenExpires ? Math.ceil((tokenExpires.getTime() - now.getTime()) / 86400000) : null;

  const header = (subtitle: string) => `
  <tr><td style="padding:0 0 4px;">
    <div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6366f1;">Raport reclame</div>
    <div style="font-size:24px;font-weight:800;color:#0f172a;margin-top:2px;">${esc(dayLabel(today, true))}</div>
    <div style="font-size:13px;color:#64748b;margin-top:4px;">${esc(subtitle)}</div>
  </td></tr>`;

  const wrap = (rows: string) => `<!DOCTYPE html>
<html lang="ro"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:14px;"><tr><td style="padding:28px 24px;">
<table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
</td></tr></table>
<div style="max-width:640px;font-size:11px;color:#94a3b8;margin-top:12px;text-align:center;">Mesaj automat, zilnic la 08:00. Perioadă: zile încheiate, până ieri.</div>
</td></tr></table></body></html>`;

  const link = `<tr><td style="padding:20px 0 0;text-align:center;"><a href="${statsUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">Deschide statisticile</a></td></tr>`;

  if (!ads.connected || ("error" in ads && ads.error && ads.rows.length === 0)) {
    const message = "error" in ads && ads.error ? ads.error : "Nu am putut citi datele de la Meta.";
    const html = wrap(`${header("Nu am putut face analiza de azi")}
      <tr><td style="padding:18px 0 0;"><div style="border:1px solid ${COLORS.stop.border};background:${COLORS.stop.soft};border-radius:10px;padding:14px 16px;font-size:14px;color:#7f1d1d;line-height:1.5;"><strong>Atenție.</strong> ${esc(message)}<br/>Verifică conexiunea Meta din Setări. Până atunci nu ai verdicte pentru scalare.</div></td></tr>${link}`);
    return { subject: "Raport reclame: nu am putut citi datele Meta", html, counts: { scale: 0, watch: 0, stop: 0 } };
  }

  const campaigns = ads.campaigns.filter((c) => c.active !== false || c.verdict.code === "scale");
  const by = (code: string) => campaigns.filter((c) => c.verdict.code === code);
  const toScale = by("scale").sort((a, b) => b.spend - a.spend);
  const toStop = by("stop").sort((a, b) => b.spend - a.spend);
  const toWatch = by("watch").sort((a, b) => b.spend - a.spend);
  const waiting = by("cooldown").sort((a, b) => b.spend - a.spend);
  const early = campaigns.filter((c) => ["early", "nospend", "noprice"].includes(c.verdict.code));

  // Ads inside the campaigns: to remove (stop) and winners (scale), only from campaigns that are running
  const activeCampaignIds = new Set(campaigns.map((c) => c.key));
  const adsToRemove = ads.rows.filter((r) => r.verdict.code === "stop" && r.campaignId && activeCampaignIds.has(r.campaignId) && r.active !== false).sort((a, b) => b.spend - a.spend);
  const winners = ads.rows.filter((r) => r.verdict.code === "scale" && r.campaignId && activeCampaignIds.has(r.campaignId) && r.active !== false).sort((a, b) => b.ordered - a.ordered).slice(0, 5);

  // ---- Headline ----
  const counts = { scale: toScale.length, watch: toWatch.length, stop: toStop.length };
  const parts: string[] = [];
  if (counts.scale) parts.push(`${counts.scale} de scalat`);
  if (counts.stop) parts.push(`${counts.stop} de oprit`);
  if (counts.watch) parts.push(`${counts.watch} de urmărit`);
  if (waiting.length) parts.push(`${waiting.length} în așteptare`);
  const nothingToDo = counts.scale === 0 && counts.stop === 0;
  const headline = nothingToDo
    ? "Nimic de scalat sau de oprit azi."
    : [counts.scale ? `${counts.scale} ${counts.scale === 1 ? "campanie de scalat" : "campanii de scalat"}` : "", counts.stop ? `${counts.stop} ${counts.stop === 1 ? "campanie de oprit" : "campanii de oprit"}` : ""].filter(Boolean).join(" și ") + ".";
  const headTone = counts.stop ? "stop" : counts.scale ? "scale" : "info";
  const headSub = nothingToDo
    ? waiting.length
      ? `${waiting.length} ${waiting.length === 1 ? "campanie are" : "campanii au"} bugetul schimbat de curând și ${waiting.length === 1 ? "așteaptă" : "așteaptă"} înainte de o nouă schimbare. Nu modifica nimic.`
      : counts.watch
      ? `${counts.watch} ${counts.watch === 1 ? "campanie rămâne" : "campanii rămân"} în urmărire; nu are rost să schimbi bugetul.`
      : "Toate campaniile sunt în ordine sau prea noi pentru o decizie."
    : counts.stop && counts.scale
    ? "Oprește mai întâi ce pierde bani, apoi scalează ce câștigă."
    : counts.stop
    ? "Scade bugetul sau oprește campaniile de mai jos."
    : "Crește bugetul gradual, după cum e indicat pe fiecare campanie.";

  const headBlock = `
  <tr><td style="padding:16px 0 0;">
    <div style="border:1px solid ${COLORS[headTone].border};background:${COLORS[headTone].soft};border-radius:12px;padding:16px 18px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${COLORS[headTone].main};">Ce faci azi</div>
      <div style="font-size:19px;font-weight:800;color:#0f172a;margin-top:4px;">${esc(headline)}</div>
      <div style="font-size:13px;color:#475569;margin-top:4px;">${esc(headSub)}</div>
    </div>
  </td></tr>`;

  // ---- Sections ----
  let body = "";
  if (toStop.length) {
    body += section("De oprit", "Au cheltuit destul și ies peste pragul de oprire. Prima acțiune de azi.", "stop",
      toStop.map((c) => card(c, "stop", `<div style="margin-top:8px;font-size:13px;font-weight:700;color:${COLORS.stop.main};">Acțiune: oprește sau scade bugetul la minim.</div>`)).join(""));
  }
  if (toScale.length) {
    body += section("De scalat", "CPA sub pragul de scalare pe 7 zile, iar ultimele 3 zile confirmă.", "scale",
      toScale.map((c) => card(c, "scale", `<div style="margin-top:8px;font-size:13px;font-weight:700;color:${COLORS.scale.main};">Acțiune: crește bugetul cu ${budgetStep(c)}, o singură dată. Verifică din nou peste 3 zile.</div>`)).join(""));
  }
  if (waiting.length) {
    const noteOf = (c: Campaign) => {
      const b = c.budgetChange;
      if (!b) return "";
      const budget = b.oldBudget !== null && b.newBudget !== null ? `${lei(b.oldBudget)} → ${lei(b.newBudget)} pe zi${b.pct !== null ? ` (${pctText(b.pct)})` : ""}` : "buget modificat";
      return `<div style="margin-top:8px;font-size:13px;font-weight:700;color:${COLORS.info.main};">Buget schimbat pe ${esc(dayLabel(b.date))}: ${esc(budget)}. Nu îl mai schimba până pe ${esc(dayLabel(b.until))}</div>`;
    };
    body += section("Așteaptă după schimbarea de buget", "Ai schimbat bugetul de curând (detectat automat din Meta). Le lăsăm 3 zile să se așeze, apoi le judecăm din nou.", "info",
      waiting.map((c) => card(c, "info", noteOf(c))).join(""));
  }
  if (toWatch.length) {
    const rows = toWatch.map((c) => {
      const cpa3 = c.recent3 && c.recent3.orders > 0 ? c.recent3.spend / c.recent3.orders : null;
      return `<tr>
        <td style="padding:9px 8px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a;font-weight:600;">${esc(c.name)}<div style="font-size:11px;color:#64748b;font-weight:400;">${esc(c.product ?? c.slug)}</div></td>
        <td style="padding:9px 8px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a;text-align:right;white-space:nowrap;">${c.cpa === null ? "–" : lei(c.cpa)}</td>
        <td style="padding:9px 8px;border-bottom:1px solid #f1f5f9;font-size:13px;color:${cpa3 !== null && c.cpaMax !== null && cpa3 > c.cpaMax ? "#b91c1c" : "#0f172a"};text-align:right;white-space:nowrap;">${cpa3 === null ? "–" : lei(cpa3)}</td>
        <td style="padding:9px 8px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;text-align:right;white-space:nowrap;">${c.scaleBelow ?? "–"} / ${c.cpaMax ?? "–"}</td>
      </tr>`;
    }).join("");
    body += section("De urmărit", "Nu sunt nici de scalat, nici de oprit. Nu schimba bugetul.", "watch", `
      <tr><td><table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 8px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;">Campanie</td>
          <td style="padding:6px 8px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;text-align:right;">CPA 7 zile</td>
          <td style="padding:6px 8px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;text-align:right;">CPA 3 zile</td>
          <td style="padding:6px 8px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;text-align:right;">Scalare / max</td>
        </tr>${rows}
      </table></td></tr>`);
  }
  if (adsToRemove.length || winners.length) {
    const li = (r: AdRow) => `<li style="margin:0 0 6px;"><strong>${esc(r.name)}</strong> <span style="color:#64748b;">(${esc(r.campaign)})</span>: ${lei(r.spend)} cheltuiți, ${r.ordered} ${r.ordered === 1 ? "comandă" : "comenzi"}${r.cpa !== null ? `, CPA ${lei(r.cpa)}` : ""}</li>`;
    body += section("Reclame din campanii", "Decizii de creativ, nu de buget: bugetul îl împarte Meta în interiorul campaniei.", "info", `
      <tr><td style="font-size:13px;color:#1e293b;line-height:1.5;">
        ${adsToRemove.length ? `<div style="font-weight:700;color:${COLORS.stop.main};margin-bottom:4px;">De scos (${adsToRemove.length})</div><ul style="margin:0 0 12px;padding-left:18px;">${adsToRemove.slice(0, 6).map(li).join("")}</ul>` : ""}
        ${winners.length ? `<div style="font-weight:700;color:${COLORS.scale.main};margin-bottom:4px;">Câștigătoare, model pentru reclame noi (${winners.length})</div><ul style="margin:0;padding-left:18px;">${winners.map(li).join("")}</ul>` : ""}
      </td></tr>`);
  }

  // ---- Analysis ----
  const withCpa = campaigns.filter((c) => c.spend > 0);
  const totalSpend = withCpa.reduce((s, c) => s + c.spend, 0);
  const totalOrders = withCpa.reduce((s, c) => s + c.ordered, 0);
  const blended = totalOrders > 0 ? totalSpend / totalOrders : null;
  const weightedMax = totalOrders > 0 ? withCpa.reduce((s, c) => s + (c.cpaMax ?? 0) * c.ordered, 0) / totalOrders : null;
  const worse = campaigns.filter((c) => c.trend === "worse" && c.trendPct !== null && c.spend >= 300).sort((a, b) => (b.trendPct ?? 0) - (a.trendPct ?? 0));
  const better = campaigns.filter((c) => c.trend === "better" && c.trendPct !== null && c.spend >= 300).sort((a, b) => (a.trendPct ?? 0) - (b.trendPct ?? 0));
  const tight = toScale.filter((c) => c.cpa !== null && c.scaleBelow !== null && c.scaleBelow - c.cpa <= 2);
  const over3 = campaigns.filter((c) => c.verdict.code !== "stop" && c.recent3 && c.cpaMax !== null && c.recent3.orders > 0 && c.recent3.spend / c.recent3.orders > c.cpaMax);

  const analysis: string[] = [];
  if (blended !== null && weightedMax !== null && weightedMax > 0) {
    const gap = Math.round(((weightedMax - blended) / weightedMax) * 100);
    analysis.push(`<strong>Total 7 zile:</strong> ${lei(totalSpend)} cheltuiți, ${totalOrders} comenzi, CPA mediu ${lei(blended)} față de un cost maxim mediu de ${lei(weightedMax)} (${gap >= 0 ? `cu ${gap}% sub echilibru` : `cu ${Math.abs(gap)}% peste echilibru`}).`);
  }
  if (worse.length) analysis.push(`<strong>Se deteriorează față de săptămâna dinainte:</strong> ${worse.slice(0, 3).map((c) => `${esc(c.name)} (CPA ${pctText(c.trendPct)})`).join(", ")}.`);
  if (better.length) analysis.push(`<strong>Se îmbunătățesc:</strong> ${better.slice(0, 3).map((c) => `${esc(c.name)} (CPA ${pctText(c.trendPct)})`).join(", ")}.`);
  if (tight.length) analysis.push(`<strong>Marjă mică la scalare:</strong> ${tight.map((c) => `${esc(c.name)} (CPA ${lei(c.cpa as number)} față de pragul ${c.scaleBelow})`).join(", ")}. Dacă urcă un leu, iese din lista de scalat; scalează încet.`);
  if (over3.length) analysis.push(`<strong>Ultimele 3 zile sunt peste costul maxim la:</strong> ${over3.slice(0, 4).map((c) => `${esc(c.name)} (CPA ${lei((c.recent3 as { spend: number; orders: number }).spend / (c.recent3 as { spend: number; orders: number }).orders)} față de ${c.cpaMax})`).join(", ")}. Urmărește-le zilnic.`);
  if (early.length) analysis.push(`${early.length} ${early.length === 1 ? "campanie are" : "campanii au"} prea puține date pentru o decizie.`);
  if (ads.otherSpend && ads.otherSpend.total >= 100) analysis.push(`${lei(ads.otherSpend.total)} au fost cheltuiți pe ${ads.otherSpend.count} reclame fără vizite pe paginile proprii (alte pagini sau magazine). Nu sunt judecate aici.`);
  if (analysis.length) {
    body += section("Analiză", `${dayLabel(from)} – ${dayLabel(to)} (7 zile încheiate), cu ultimele 3 zile ${dayLabel(from3)} – ${dayLabel(to)} ca verificare`, "info", `
      <tr><td><ul style="margin:0;padding-left:18px;font-size:13px;color:#1e293b;line-height:1.55;">${bullets(analysis)}</ul></td></tr>`);
  }

  // ---- Thresholds used ----
  if (breakEven) {
    const rows = breakEven.rows.filter((r) => r.verdict.code !== "inactive" && r.cpaMax != null).map((r) => {
      const source = r.detail.retRateSource === "manual" ? "manual" : r.detail.retRateSource === "default" ? "implicit" : "calculat";
      return `<tr>
        <td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#0f172a;font-weight:600;">${esc(r.product)}</td>
        <td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#475569;text-align:right;">${Math.round(r.detail.retRate * 100)}% <span style="color:#94a3b8;">(${source})</span></td>
        <td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#0f172a;text-align:right;">${r.scaleBelow}</td>
        <td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#0f172a;text-align:right;">${r.cpaMax}</td>
        <td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#0f172a;text-align:right;">${r.stopAbove}</td>
      </tr>`;
    }).join("");
    if (rows) {
      body += section("Pragurile folosite azi", "Din Break-even; rata de retur manuală înlocuiește pe cea calculată.", "info", `
        <tr><td><table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:6px 8px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;">Produs</td>
            <td style="padding:6px 8px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;text-align:right;">Retur</td>
            <td style="padding:6px 8px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;text-align:right;">Scalare</td>
            <td style="padding:6px 8px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;text-align:right;">Maxim</td>
            <td style="padding:6px 8px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;text-align:right;">Oprire</td>
          </tr>${rows}
        </table></td></tr>`);
    }
  }

  // ---- Warnings ----
  let warning = "";
  if (daysToExpiry !== null && daysToExpiry <= 14) {
    warning += `<tr><td style="padding:18px 0 0;"><div style="border:1px solid ${COLORS.watch.border};background:${COLORS.watch.soft};border-radius:10px;padding:12px 16px;font-size:13px;color:#78350f;line-height:1.5;"><strong>Token-ul Meta expiră ${daysToExpiry <= 0 ? "azi sau a expirat deja" : `în ${daysToExpiry} ${daysToExpiry === 1 ? "zi" : "zile"}`}.</strong> Reînnoiește-l din Setări; altfel raportul nu va mai putea citi cheltuiala.</div></td></tr>`;
  }
  if ("error" in ads && ads.error) {
    warning += `<tr><td style="padding:14px 0 0;"><div style="border:1px solid ${COLORS.watch.border};background:${COLORS.watch.soft};border-radius:10px;padding:12px 16px;font-size:13px;color:#78350f;">${esc(ads.error)}</div></td></tr>`;
  }

  const html = wrap(`${header(`${dayLabel(from)} – ${dayLabel(to)} · 7 zile încheiate`)}${headBlock}${warning}${body}${link}`);
  const subject = `Reclame ${dayLabel(today)}: ${nothingToDo ? "nimic de scalat sau de oprit" : parts.join(" · ")}`;
  return { subject, html, counts };
}
