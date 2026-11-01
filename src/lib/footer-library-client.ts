// Editor side: the footers of the active organization, fetched once and shared by the footer picker and the preview.
export type FooterRow = { id: string; name: string; block: unknown; is_default: boolean; usage?: number };

let cache: Promise<FooterRow[]> | null = null;

export function loadFooters(): Promise<FooterRow[]> {
  if (!cache) {
    cache = fetch("/api/page-footers")
      .then((res) => (res.ok ? res.json() : { footers: [] }))
      .then((data) => (Array.isArray(data.footers) ? (data.footers as FooterRow[]) : []))
      .catch(() => {
        cache = null;
        return [];
      });
  }
  return cache;
}

/** Forget the fetched list (after a footer was created, changed or deleted) */
export function resetFooters() {
  cache = null;
}
