// Starting point of a new own page created from a landing page: a short, common structure with the order form
// already wired to that landing page (slug, organization, own thank-you page), so nothing is typed by hand.
import { blockDef } from "@/lib/page-block-schemas";

export function starterBlocks(input: { title: string; landingSlug: string; orgSlug: string }): Record<string, unknown>[] {
  const footer = blockDef("footer")?.create() ?? { type: "footer" };
  return [
    { type: "topbar", mode: "fixed", text: "Plată la livrare · Livrare 1-3 zile", bg: "#202020", color: "#ffffff" },
    { type: "text", text: `**${input.title}**`, align: "center", size: "2xl", color: "#18181b", bold: true, label: "Titlu" },
    { type: "list", items: ["Beneficiul 1", "Beneficiul 2", "Beneficiul 3"], icon: "check", iconColor: "#16a34a", color: "#18181b", size: "base", label: "Beneficii" },
    { type: "button", text: "Comandă acum", href: "#comanda", bg: "#f97316", color: "#ffffff" },
    { type: "form", landingSlug: input.landingSlug, org: input.orgSlug, thankYouPath: "/thank-you" },
    footer,
  ];
}
