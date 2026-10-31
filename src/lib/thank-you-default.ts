// Built-in thank-you page, used when an organization has not saved its own.
export const DEFAULT_THANK_YOU = {
  title: "Comanda ta",
  background: "#0f172a",
  blocks: [
    { type: "spacer", height: 16 },
    // Phase "offer": the postsale offer, while it is open
    { type: "postsale_offer", phase: "offer" },
    // Phase "final": after the offer is accepted, declined or expired (or when there is no offer)
    { type: "text", text: "COMANDĂ FINALIZATĂ!", align: "center", size: "2xl", bold: true, color: "#22c55e", phase: "final" },
    { type: "order_summary", phase: "final" },
    // Store button (message + "see all products"): replaces the plain message below when it is available
    { type: "store_cta", phase: "final", showWhen: "cta" },
    {
      type: "text",
      text: "Comanda ta este înregistrată. Un coleg te sună în curând pentru confirmare. Coletul ajunge în 1-3 zile și plătești la livrare.",
      align: "center",
      size: "base",
      color: "#e2e8f0",
      phase: "final",
      showWhen: "no_cta",
    },
  ],
};
