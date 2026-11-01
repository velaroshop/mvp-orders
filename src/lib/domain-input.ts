// Validation of a hostname typed by the user (pure, shared by the API and the tests)

export const MAX_DOMAINS_PER_ORG = 5;
export const VERIFY_PREFIX = "_velaro-verify";

const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;

/** Hostnames of this application itself: nobody can attach those (or anything under them) */
function reservedHosts(): string[] {
  const hosts = ["localhost", "mvp-orders.vercel.app"];
  for (const value of [process.env.NEXTAUTH_URL, process.env.NEXT_PUBLIC_APP_URL]) {
    try {
      if (value) hosts.push(new URL(value).hostname.toLowerCase());
    } catch {
      // not a URL: ignore
    }
  }
  return hosts;
}

export type HostnameResult = { ok: true; hostname: string } | { ok: false; error: string };

/**
 * Accepts "comanda.client.ro", also when pasted as "https://Comanda.Client.ro/pagina". Letters, digits and hyphens only
 * (internationalized names must be given in their "xn--" form, which avoids look-alike characters).
 */
export function parseHostname(raw: unknown): HostnameResult {
  if (typeof raw !== "string") return { ok: false, error: "Introdu un domeniu" };
  let value = raw.trim().toLowerCase();
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, "").split(/[/?#]/)[0].replace(/:\d+$/, "").replace(/\.$/, "");

  if (!value) return { ok: false, error: "Introdu un domeniu" };
  if (value.length > 253) return { ok: false, error: "Domeniul e prea lung" };
  if (value.includes("*")) return { ok: false, error: "Domeniile cu * (wildcard) nu sunt permise" };
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value) || value.includes(":")) return { ok: false, error: "Adresele IP nu sunt permise, folosește un nume de domeniu" };

  const labels = value.split(".");
  if (labels.length < 2 || !labels.every((l) => LABEL.test(l))) {
    return { ok: false, error: "Domeniu invalid. Folosește litere mici, cifre și cratime, de exemplu comanda.firma.ro" };
  }
  if (!/^[a-z]{2,}$|^xn--[a-z0-9-]+$/.test(labels[labels.length - 1])) return { ok: false, error: "Extensia domeniului nu este validă" };

  for (const reserved of reservedHosts()) {
    if (value === reserved || value.endsWith(`.${reserved}`)) return { ok: false, error: "Acest domeniu aparține aplicației și nu poate fi folosit" };
  }
  if (value.endsWith(".vercel.app") || value.endsWith(".localhost")) return { ok: false, error: "Acest domeniu nu poate fi folosit" };

  return { ok: true, hostname: value };
}

/** The TXT record the owner must create to prove control of the domain */
export function verificationRecord(hostname: string, token: string): { name: string; value: string } {
  return { name: `${VERIFY_PREFIX}.${hostname}`, value: `velaro-verify=${token}` };
}
