// Built-in thank-you page, used when an organization has not saved its own.
export const DEFAULT_THANK_YOU = {
  title: "Comanda ta",
  background: "#0f172a",
  blocks: [
    { type: "spacer", height: 16 },
    { type: "text", text: "COMANDĂ FINALIZATĂ!", align: "center", size: "2xl", bold: true, color: "#22c55e" },
    { type: "order_summary" },
    {
      type: "text",
      text: "Comanda ta este înregistrată. Un coleg te sună în curând pentru confirmare. Coletul ajunge în 1-3 zile și plătești la livrare.",
      align: "center",
      size: "base",
      color: "#e2e8f0",
    },
  ],
};
