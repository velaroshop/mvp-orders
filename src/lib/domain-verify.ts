// Server only. Checks that the TXT record proving control of a domain exists.
import { Resolver } from "node:dns/promises";
import { verificationRecord } from "@/lib/domain-input";

export type TxtCheck = { ok: true } | { ok: false; reason: "not_found" | "lookup_failed" };

async function lookup(servers: string[] | null, name: string): Promise<string[]> {
  const resolver = new Resolver({ timeout: 4000, tries: 2 });
  if (servers) resolver.setServers(servers);
  const records = await resolver.resolveTxt(name);
  // A long TXT value is split into several strings: join them
  return records.map((chunks) => chunks.join(""));
}

export async function checkVerificationTxt(hostname: string, token: string): Promise<TxtCheck> {
  const { name, value } = verificationRecord(hostname, token);
  // Public resolvers first (fresh answers), then the default resolver of the server
  for (const servers of [["1.1.1.1", "8.8.8.8"], null]) {
    try {
      const values = await lookup(servers, name);
      if (values.some((v) => v.trim() === value)) return { ok: true };
      return { ok: false, reason: "not_found" };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      // The name does not exist (yet): the record was not created
      if (code === "ENOTFOUND" || code === "ENODATA") return { ok: false, reason: "not_found" };
    }
  }
  return { ok: false, reason: "lookup_failed" };
}
