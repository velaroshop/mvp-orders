// Editor side: the landing pages of the active organization, fetched once and shared by the form block's picker.
export type LandingRow = { id: string; name: string; slug: string; status: string; productName: string | null; productStatus: string | null };

let cache: Promise<LandingRow[]> | null = null;

export function loadLandingPages(): Promise<LandingRow[]> {
  if (!cache) {
    cache = fetch("/api/landing-pages?limit=200")
      .then((res) => (res.ok ? res.json() : { landingPages: [] }))
      .then((data) =>
        (Array.isArray(data.landingPages) ? data.landingPages : []).map(
          (lp: { id: string; name?: string; slug: string; status?: string; products?: { name?: string; status?: string } | null }) => ({
            id: lp.id,
            name: lp.name ?? lp.slug,
            slug: lp.slug,
            status: lp.status ?? "",
            productName: lp.products?.name ?? null,
            productStatus: lp.products?.status ?? null,
          }),
        ),
      )
      .catch(() => {
        cache = null;
        return [];
      });
  }
  return cache;
}
