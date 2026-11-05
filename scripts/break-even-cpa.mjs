#!/usr/bin/env node
// CPA break-even per produs (doar citire din Supabase, nu modifică nimic).
//
// Rulare lunară:
//   node scripts/break-even-cpa.mjs                    # toate produsele, tabel
//   node scripts/break-even-cpa.mjs --detail "SlimGel" # + calcul pas cu pas pentru un produs
//   node scripts/break-even-cpa.mjs --window 90 --maturity 30
//
// Necesită în .env.local: NEXT_PUBLIC_SUPABASE_URL și SUPABASE_SERVICE_ROLE_KEY (cheia reală).
// Opțional: ORG_ID=<uuid> (altfel se caută organizația al cărei nume conține "reduxio").
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ---- Parametri (suprascriși din linia de comandă) ----
const DEFAULTS = {
  window: 90,        // zile de comenzi analizate (după data plasării)
  maturity: 30,      // ignoră comenzile mai noi de atâtea zile (statusul de livrare/retur nu e încă final)
  vat: 0.21,         // TVA aplicat la AOV: venit net = AOV / (1 + vat)
  courierPack: 15,   // lei/comandă livrată: curier + ambalare (fără TVA)
  returnBack: 0,     // lei: curier retur (drumul înapoi) plătit la refuz; 0 = returul nu costă nimic
  upsellCost: 5,     // lei/comandă cu upsell (cost produs upsell)
  minOrders: 30,     // sub acest număr de comenzi plasate => prag nesigur
  stopMult: 1.5,
  scaleMult: 0.7,
};

const CONFIRMED_STATUSES = ["confirmed", "scheduled"];
const SHIPPED_FINAL = ["Delivered", "Returned", "Returning"]; // statusuri Helpship care implică confirmare
const RETURNED = ["Returned", "Returning"];

const n = (v) => (v == null || v === "" ? 0 : Number(v));
const hasUpsell = (u) => {
  let x = u;
  if (typeof x === "string") { try { x = JSON.parse(x); } catch { return false; } }
  return Array.isArray(x) && x.length > 0;
};

/**
 * Calcul pur pe un grup de comenzi (un produs).
 * orders: [{ total, status, tracking_status, quantity, upsells }]
 * unitCost: cost/bucată fără TVA (products.import_price) sau null.
 */
export function computeProduct(orders, unitCost, p) {
  const placed = orders.length;
  const confirmed = orders.filter(
    (o) => CONFIRMED_STATUSES.includes(o.status) || SHIPPED_FINAL.includes(o.tracking_status)
  );
  // rata de retur = refuzate / (livrate + refuzate) dintre cele confirmate; restul = încă nerezolvate
  const delivered = confirmed.filter((o) => o.tracking_status === "Delivered").length;
  const returned = confirmed.filter((o) => RETURNED.includes(o.tracking_status)).length;
  const resolved = delivered + returned;

  const aov = placed ? orders.reduce((s, o) => s + n(o.total), 0) / placed : 0;
  const net = aov / (1 + p.vat);
  const avgQty = placed ? orders.reduce((s, o) => s + n(o.quantity), 0) / placed : 0;
  const upsellShare = placed ? orders.filter((o) => hasUpsell(o.upsells)).length / placed : 0;

  const confRate = placed ? confirmed.length / placed : 0;
  const retRate = resolved ? returned / resolved : 0;

  const productCost = unitCost == null ? null : unitCost * avgQty;
  const costDelivered = productCost == null ? null : productCost + p.courierPack + p.upsellCost * upsellShare;
  const returnLoss = p.courierPack + p.returnBack; // produsul se recuperează

  let profitDelivered = null, cpaMax = null;
  if (costDelivered != null) {
    profitDelivered = net - costDelivered;
    cpaMax =
      profitDelivered * confRate * (1 - retRate) -
      returnLoss * confRate * retRate;
  }
  const mix = {};
  for (const o of orders) mix[o.offer_code || "?"] = (mix[o.offer_code || "?"] || 0) + 1;

  return {
    placed, confirmed: confirmed.length, delivered, returned, unresolved: confirmed.length - resolved,
    aov, net, avgQty, upsellShare, confRate, retRate, productCost, costDelivered, returnLoss,
    profitDelivered, cpaMax,
    stopAbove: cpaMax == null ? null : cpaMax * p.stopMult,
    scaleBelow: cpaMax == null ? null : cpaMax * p.scaleMult,
    lowSample: placed < p.minOrders,
    mix,
  };
}

const f1 = (x) => (x == null ? "n/a" : x.toFixed(1));
const f2 = (x) => (x == null ? "n/a" : x.toFixed(2));
const pct = (x) => (x * 100).toFixed(1) + "%";

function printDetail(name, r, p) {
  const L = [];
  L.push(`\n=== Calcul pas cu pas: ${name} ===`);
  L.push(`1. Mix oferte (comenzi): ${Object.entries(r.mix).map(([k, v]) => `${k}=${v}`).join(", ")}; bucăți medii/comandă = ${f2(r.avgQty)}; comenzi cu upsell = ${pct(r.upsellShare)}`);
  L.push(`   AOV (total cu livrare și upsell-uri, pe comenzi plasate) = ${f2(r.aov)} lei`);
  L.push(`2. Rată confirmare = ${r.confirmed} / ${r.placed} = ${pct(r.confRate)}`);
  L.push(`3. Rată retur = ${r.returned} refuzate / (${r.delivered} livrate + ${r.returned} refuzate) = ${pct(r.retRate)}  (${r.unresolved} confirmate încă nerezolvate, excluse)`);
  L.push(`4. Venit net = ${f2(r.aov)} / ${1 + p.vat} = ${f2(r.net)} lei`);
  L.push(`5. Cost/comandă livrată = produs ${f2(r.productCost)} (${f2(r.avgQty)} buc × cost unitar) + ${p.courierPack} curier+ambalare + ${p.upsellCost} × ${pct(r.upsellShare)} upsell = ${f2(r.costDelivered)} lei`);
  L.push(`   Pierdere pe retur = ${p.courierPack} dus + ${p.returnBack} întors = ${r.returnLoss} lei (produsul se recuperează)`);
  L.push(`6. Profit/comandă livrată = ${f2(r.net)} − ${f2(r.costDelivered)} = ${f2(r.profitDelivered)} lei`);
  L.push(`   Profit/comandă plasată = ${f2(r.profitDelivered)} × ${pct(r.confRate)} × (1 − ${pct(r.retRate)}) − ${r.returnLoss} × ${pct(r.confRate)} × ${pct(r.retRate)}`);
  L.push(`7. CPA maxim = ${f2(r.cpaMax)} lei`);
  L.push(`8. Oprește peste ${p.stopMult} × = ${f2(r.stopAbove)} | Scalează sub ${p.scaleMult} × = ${f2(r.scaleBelow)}`);
  console.log(L.join("\n"));
}

function loadEnv() {
  const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".env.local");
  return Object.fromEntries(
    fs.readFileSync(file, "utf8").split("\n")
      .filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
  );
}

async function fetchAll(sb, table, cols, mod) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    let q = sb.from(table).select(cols).range(from, from + 999);
    if (mod) q = mod(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const p = { ...DEFAULTS };
  let detail = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--detail") detail = args[++i];
    else if (a.startsWith("--") && a.slice(2) in p) p[a.slice(2)] = Number(args[++i]);
  }

  const env = { ...loadEnv(), ...process.env };
  if (!env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY.startsWith("your-")) {
    console.error("SUPABASE_SERVICE_ROLE_KEY lipsește sau e placeholder în .env.local.");
    process.exit(1);
  }
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  let orgId = env.ORG_ID;
  if (!orgId) {
    const { data, error } = await sb.from("organizations").select("id,name");
    if (error) throw new Error(`organizations: ${error.message}`);
    const hit = data.filter((o) => /reduxio/i.test(o.name));
    if (hit.length !== 1) throw new Error(`Setează ORG_ID. Organizații: ${data.map((o) => `${o.name}=${o.id}`).join(", ")}`);
    orgId = hit[0].id;
  }

  const day = 86400000;
  const to = new Date(Date.now() - p.maturity * day).toISOString();
  const from = new Date(Date.now() - (p.maturity + p.window) * day).toISOString();

  const [orders, lps, products, settings] = await Promise.all([
    fetchAll(sb, "orders", "created_at,status,tracking_status,offer_code,product_name,product_quantity,total,upsells,landing_key,source",
      (q) => q.eq("organization_id", orgId).neq("status", "testing").gte("created_at", from).lt("created_at", to)),
    fetchAll(sb, "landing_pages", "slug,product_id,quantity_offer_1,quantity_offer_2,quantity_offer_3", (q) => q.eq("organization_id", orgId)),
    fetchAll(sb, "products", "id,name,import_price", (q) => q.eq("organization_id", orgId)),
    fetchAll(sb, "settings", "vat_enabled,courier_cost,packaging_cost", (q) => q.eq("organization_id", orgId)),
  ]);

  const st = settings[0];
  if (st && !st.vat_enabled) console.warn("! settings.vat_enabled = false: firma nu e plătitoare TVA în aplicație; împărțirea la 1.21 poate fi greșită (--vat 0).");
  if (st && n(st.courier_cost) + n(st.packaging_cost) > 0 && n(st.courier_cost) + n(st.packaging_cost) !== p.courierPack)
    console.warn(`! Aplicația are curier+ambalare = ${n(st.courier_cost) + n(st.packaging_cost)} lei, scriptul folosește ${p.courierPack} (--courierPack).`);

  // comenzile introduse manual din parțiale nu intră în calcul (Meta nu le vede, se întorc mai des)
  const directOrders = orders.filter((o) => o.source !== "partial");
  const lpBySlug = Object.fromEntries(lps.map((l) => [l.slug, l]));
  const prodById = Object.fromEntries(products.map((x) => [x.id, x]));
  const groups = {};
  for (const o of directOrders) {
    const lp = lpBySlug[o.landing_key];
    const prod = lp?.product_id ? prodById[lp.product_id] : null;
    const name = o.product_name || prod?.name || o.landing_key || "necunoscut";
    const qty = o.product_quantity || (lp && n(lp[`quantity_${o.offer_code}`])) || 1;
    (groups[name] ||= { cost: prod?.import_price ?? null, orders: [] }).orders.push({ ...o, quantity: qty });
    if (groups[name].cost == null && prod?.import_price != null) groups[name].cost = prod.import_price;
  }

  const rows = Object.entries(groups)
    .map(([name, g]) => [name, computeProduct(g.orders, g.cost == null ? null : n(g.cost), p)])
    .sort((a, b) => b[1].placed - a[1].placed);

  console.log(`Comenzi plasate între ${from.slice(0, 10)} și ${to.slice(0, 10)} (maturitate ${p.maturity}z), fără "testing".\n`);
  console.log("| Produs | Comenzi | AOV | Rată confirmare | Rată retur | CPA maxim | Oprește peste | Scalează sub | Note |");
  console.log("|---|---|---|---|---|---|---|---|---|");
  for (const [name, r] of rows) {
    const notes = [r.lowSample && `⚠ <${p.minOrders} comenzi`, r.productCost == null && "lipsește import_price", r.cpaMax != null && r.cpaMax <= 0 && "CPA ≤ 0 (pierdere înainte de reclame)"].filter(Boolean).join("; ");
    console.log(`| ${name} | ${r.placed} | ${f1(r.aov)} | ${pct(r.confRate)} | ${pct(r.retRate)} | ${f1(r.cpaMax)} | ${f1(r.stopAbove)} | ${f1(r.scaleBelow)} | ${notes} |`);
  }
  if (detail) {
    const hit = rows.find(([name]) => name.toLowerCase().includes(detail.toLowerCase()));
    if (hit) printDetail(hit[0], hit[1], p); else console.error(`Produsul "${detail}" nu a fost găsit.`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
