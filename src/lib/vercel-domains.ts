// Server only. Thin client for the parts of the Vercel REST API used to attach custom domains to this project.
// Needs VERCEL_API_TOKEN and VERCEL_PROJECT_ID (and VERCEL_TEAM_ID when the project belongs to a team).

const API = "https://api.vercel.com";

export function isVercelConfigured(): boolean {
  return Boolean(process.env.VERCEL_API_TOKEN && process.env.VERCEL_PROJECT_ID);
}

type Challenge = { type: string; domain: string; value: string; reason?: string };

export type ProjectDomain = { name: string; apexName: string; verified: boolean; verification: Challenge[] };
export type DomainConfig = {
  misconfigured: boolean;
  configuredBy: string | null;
  recommendedCNAME: string | null;
  recommendedIPv4: string | null;
};

export type VercelResult<T> = { ok: true; data: T } | { ok: false; status: number; code: string; message: string };

async function call<T>(method: string, path: string, query: Record<string, string> = {}, body?: unknown): Promise<VercelResult<T>> {
  const params = new URLSearchParams(query);
  if (process.env.VERCEL_TEAM_ID) params.set("teamId", process.env.VERCEL_TEAM_ID);
  try {
    const res = await fetch(`${API}${path}${params.size ? `?${params}` : ""}`, {
      method,
      headers: { Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = (json as { error?: { code?: string; message?: string } }).error ?? {};
      return { ok: false, status: res.status, code: error.code ?? "unknown", message: error.message ?? `Vercel a răspuns ${res.status}` };
    }
    return { ok: true, data: json as T };
  } catch (error) {
    return { ok: false, status: 0, code: "network", message: error instanceof Error ? error.message : "Nu am putut contacta Vercel" };
  }
}

const project = () => encodeURIComponent(process.env.VERCEL_PROJECT_ID ?? "");

const toProjectDomain = (raw: Partial<ProjectDomain> & { name: string }): ProjectDomain => ({
  name: raw.name,
  apexName: raw.apexName ?? raw.name,
  verified: raw.verified === true,
  verification: Array.isArray(raw.verification) ? raw.verification : [],
});

/** Adds the domain to the project. A domain that is already on the project counts as success. */
export async function addDomain(hostname: string): Promise<VercelResult<ProjectDomain>> {
  const added = await call<ProjectDomain>("POST", `/v10/projects/${project()}/domains`, {}, { name: hostname });
  if (added.ok) return { ok: true, data: toProjectDomain(added.data) };
  // 400 "already exists on the project": read it instead
  if (added.status === 400 && /already/i.test(added.message)) return getProjectDomain(hostname);
  return added;
}

export async function getProjectDomain(hostname: string): Promise<VercelResult<ProjectDomain>> {
  const result = await call<ProjectDomain>("GET", `/v9/projects/${project()}/domains/${encodeURIComponent(hostname)}`);
  return result.ok ? { ok: true, data: toProjectDomain(result.data) } : result;
}

/** Asks Vercel to re-check the ownership challenge of a domain it could not verify yet */
export async function verifyProjectDomain(hostname: string): Promise<VercelResult<ProjectDomain>> {
  const result = await call<ProjectDomain>("POST", `/v9/projects/${project()}/domains/${encodeURIComponent(hostname)}/verify`);
  return result.ok ? { ok: true, data: toProjectDomain(result.data) } : result;
}

export async function getDomainConfig(hostname: string): Promise<VercelResult<DomainConfig>> {
  const result = await call<{
    misconfigured?: boolean;
    configuredBy?: string | null;
    recommendedCNAME?: { rank: number; value: string }[];
    recommendedIPv4?: { rank: number; value: string[] }[];
  }>("GET", `/v6/domains/${encodeURIComponent(hostname)}/config`, { projectIdOrName: process.env.VERCEL_PROJECT_ID ?? "" });
  if (!result.ok) return result;

  const best = <T extends { rank: number }>(list: T[] | undefined): T | undefined => [...(list ?? [])].sort((a, b) => a.rank - b.rank)[0];
  return {
    ok: true,
    data: {
      misconfigured: result.data.misconfigured !== false,
      configuredBy: result.data.configuredBy ?? null,
      recommendedCNAME: best(result.data.recommendedCNAME)?.value.replace(/\.$/, "") ?? null,
      recommendedIPv4: best(result.data.recommendedIPv4)?.value[0] ?? null,
    },
  };
}

export async function removeDomain(hostname: string): Promise<VercelResult<unknown>> {
  return call("DELETE", `/v9/projects/${project()}/domains/${encodeURIComponent(hostname)}`);
}

/** The DNS record the owner must create for this hostname (CNAME for a subdomain, A for the bare domain) */
export function dnsInstruction(hostname: string, apexName: string, config: DomainConfig): { type: "A" | "CNAME"; name: string; value: string } | null {
  if (hostname === apexName) return config.recommendedIPv4 ? { type: "A", name: "@", value: config.recommendedIPv4 } : null;
  const label = hostname.endsWith(`.${apexName}`) ? hostname.slice(0, -(apexName.length + 1)) : hostname;
  return config.recommendedCNAME ? { type: "CNAME", name: label, value: config.recommendedCNAME } : null;
}
