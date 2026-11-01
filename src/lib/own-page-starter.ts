// Starting point of a new own page created from a landing page: a short, common structure with the order form
// already wired to that landing page (slug, organization, own thank-you page), so nothing is typed by hand.

export function starterBlocks(input: { title: string; landingSlug: string; orgSlug: string }): Record<string, unknown>[] {
  return [
    { type: "topbar", mode: "fixed", text: "Plată la livrare · Livrare 1-3 zile", bg: "#202020", color: "#ffffff" },
    { type: "text", text: `**${input.title}**`, align: "center", size: "2xl", color: "#18181b", bold: true, label: "Titlu" },
    { type: "list", items: ["Beneficiul 1", "Beneficiul 2", "Beneficiul 3"], icon: "check", iconColor: "#16a34a", color: "#18181b", size: "base", label: "Beneficii" },
    { type: "button", text: "Comandă acum", href: "#comanda", bg: "#f97316", color: "#ffffff" },
    { type: "form", landingSlug: input.landingSlug, org: input.orgSlug, thankYouPath: "/thank-you" },
    // The footer comes from the footer library (the default one, unless another is chosen in the editor)
    { type: "shared_footer", footerId: null },
  ];
}

/** Legal page (terms, privacy, returns...): the text goes in one formatted-text block, footer from the library */
export function legalBlocks(title: string): Record<string, unknown>[] {
  const safeTitle = title.replace(/[<>&"]/g, "");
  return [
    { type: "rich_text", html: `<h1>${safeTitle}</h1><p>Scrie sau lipește aici textul paginii.</p>`, color: "#18181b", size: 16, label: "Text" },
    { type: "shared_footer", footerId: null },
  ];
}
