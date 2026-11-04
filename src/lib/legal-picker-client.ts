// Editor side: the legal pages of the active organization, fetched once and shared by the footer link picker.
export type LegalRow = { id: string; slug: string; title: string; status: string };

let cache: Promise<LegalRow[]> | null = null;

export function loadLegalPages(): Promise<LegalRow[]> {
  if (!cache) {
    cache = fetch("/api/legal-pages")
      .then((res) => (res.ok ? res.json() : { pages: [] }))
      .then((data) => (Array.isArray(data.pages) ? (data.pages as LegalRow[]) : []))
      .catch(() => {
        cache = null;
        return [];
      });
  }
  return cache;
}
