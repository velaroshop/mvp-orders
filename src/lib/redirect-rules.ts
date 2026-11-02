// Redirect rules of a custom domain: validation (API) and matching (middleware). Pure, no framework imports.

export const MAX_REDIRECTS_PER_DOMAIN = 200;
export const REDIRECT_CODES = [301, 302, 307, 308] as const;

export type RedirectRule = { from_path: string; to_url: string; status_code: number };

// Areas of the application that are never reachable on a customer's domain: a rule for them would never be used
const RESERVED = ["/admin", "/auth", "/p", "/legal", "/page-preview", "/sites", "/dev", "/api", "/_next", "/widget", "/thank-you"];
const isUnder = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

/** "/Products/Slimgel/?a=1" -> "/products/slimgel"; a trailing "/*" is kept as the wildcard. Null when it cannot be a path. */
export function normalizeFromPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let path = raw.trim().toLowerCase().split(/[?#]/)[0];
  if (!path) return null;
  if (!path.startsWith("/")) path = `/${path}`;
  path = path.replace(/\/{2,}/g, "/");
  const wildcard = path.endsWith("/*");
  if (wildcard) path = path.slice(0, -2);
  path = path.replace(/\/+$/, "");
  if (!path || path.includes("*") || !/^\/[a-z0-9\-_.~%/]*$/.test(path) || path.length > 200) return null;
  return wildcard ? `${path}/*` : path;
}

/** The destination: a path on the same domain ("/slimgel", "/*" for wildcard rules) or an https address */
export function normalizeToUrl(raw: unknown, wildcard: boolean): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value || value.length > 500) return null;
  if (value.startsWith("/")) {
    if (value.startsWith("//") || /[\s\\]/.test(value)) return null;
    if (value.includes("*") && !(wildcard && value.endsWith("*") && value.split("*").length === 2)) return null;
    return value;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || value.includes("*")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function ruleMatches(rule: RedirectRule, pathname: string): string | null {
  const path = pathname.toLowerCase().replace(/\/{2,}/g, "/").replace(/\/+$/, "") || "/";
  if (rule.from_path.endsWith("/*")) {
    const prefix = rule.from_path.slice(0, -1); // "/products/"
    if (!path.startsWith(prefix) || path.length === prefix.length) return null;
    const rest = path.slice(prefix.length);
    return rule.to_url.includes("*") ? rule.to_url.replace("*", rest) : rule.to_url;
  }
  return rule.from_path === path ? rule.to_url : null;
}

/** The redirect for a request path: an exact rule first, then the wildcard rule with the longest prefix */
export function matchRedirect(rules: RedirectRule[], pathname: string, search = ""): { location: string; status: number } | null {
  let best: { target: string; status: number; score: number } | null = null;
  for (const rule of rules) {
    const target = ruleMatches(rule, pathname);
    if (target === null) continue;
    const score = rule.from_path.endsWith("/*") ? rule.from_path.length : Number.MAX_SAFE_INTEGER;
    if (!best || score > best.score) best = { target, status: rule.status_code, score };
  }
  if (!best) return null;
  // The visitor's parameters (fbclid, utm_*) travel with the redirect, unless the destination has its own
  const location = best.target.includes("?") || !search ? best.target : `${best.target}${search}`;
  return { location, status: best.status };
}

export type RuleCheck = { ok: true; rule: RedirectRule } | { ok: false; error: string };

/** Validates a new rule against the domain's existing ones (same "from" is a conflict, chains and loops are refused) */
export function validateRule(input: { from_path?: unknown; to_url?: unknown; status_code?: unknown }, existing: RedirectRule[]): RuleCheck {
  const from = normalizeFromPath(input.from_path);
  if (!from) return { ok: false, error: "Adresa veche e invalidă. Folosește litere mici, cifre, - _ și /, de exemplu /products/slimgel sau /pages/*" };
  const base = from.endsWith("/*") ? from.slice(0, -2) : from;
  if (base === "" || from === "/") return { ok: false, error: "Adresa de bază a domeniului (/) se setează din Domenii și din pagina de pornire, nu aici" };
  if (RESERVED.some((prefix) => isUnder(base, prefix))) return { ok: false, error: "Această adresă aparține aplicației și nu poate fi redirecționată" };

  const to = normalizeToUrl(input.to_url, from.endsWith("/*"));
  if (!to) return { ok: false, error: "Destinația trebuie să fie o adresă de pe domeniu (/slimgel; la reguli cu * poți folosi /*) sau o adresă https completă" };

  const code = Number(input.status_code ?? 302);
  if (!REDIRECT_CODES.includes(code as (typeof REDIRECT_CODES)[number])) return { ok: false, error: "Tip de redirect invalid" };

  if (existing.some((r) => r.from_path === from)) return { ok: false, error: "Există deja o regulă pentru această adresă" };
  if (existing.length >= MAX_REDIRECTS_PER_DOMAIN) return { ok: false, error: `Poți avea cel mult ${MAX_REDIRECTS_PER_DOMAIN} de reguli pe domeniu` };

  const rule: RedirectRule = { from_path: from, to_url: to, status_code: code };
  // No chains or loops: a path destination must not be redirected again by another rule
  if (to.startsWith("/")) {
    const probe = to.includes("*") ? to.replace("*", "x") : to;
    const clash = [...existing, rule].find((r) => ruleMatches(r, probe) !== null);
    if (clash) {
      if (clash === rule) return { ok: false, error: "Destinația ar fi redirecționată din nou de aceeași regulă (buclă)" };
      return { ok: false, error: `Destinația ar fi redirecționată mai departe de regula ${clash.from_path}. Pune direct adresa finală` };
    }
  }
  return { ok: true, rule };
}

/** The usual redirects of a Shopify store moving to this system */
export const SHOPIFY_PRESET: RedirectRule[] = [
  { from_path: "/products/*", to_url: "/*", status_code: 302 },
  { from_path: "/pages/politica-de-returnare-a-produselor-cosmetice", to_url: "/retur-produse-cosmetice", status_code: 302 },
  { from_path: "/pages/*", to_url: "/*", status_code: 302 },
  { from_path: "/collections/*", to_url: "/", status_code: 302 },
  { from_path: "/collections", to_url: "/", status_code: 302 },
];
