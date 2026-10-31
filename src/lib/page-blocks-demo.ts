// Fixture used only by /p/_demo in development, to check rendering without a database.
export const DEMO_PAGE = {
  title: "Demo pagină",
  background: "#ffffff",
  blocks: [
    { type: "topbar", text: "Plată la livrare · Livrare 1-3 zile", bg: "#111827", color: "#ffffff" },
    { type: "text", text: "**SlimGel** — scapă de grăsimea de pe abdomen", align: "center", size: "2xl", bold: true, color: "#111827" },
    {
      type: "image",
      src: "https://placehold.co/1080x720/f97316/ffffff.png?text=Imagine+produs",
      alt: "Produs",
      width: 1080,
      height: 720,
      rounded: true,
    },
    { type: "text", text: "Un gel care se aplică seara.\nSe simte din prima săptămână.", align: "center", size: "lg", color: "#3f3f46" },
    {
      type: "list",
      items: ["Rezultate vizibile în **14 zile**", "Se aplică ușor, fără efort", "Plătești la livrare", "Livrare în 1-3 zile"],
      icon: "check",
      iconColor: "#16a34a",
      size: "lg",
    },
    { type: "button", text: "Comandă acum", href: "#comanda", bg: "#ff6b35", color: "#ffffff" },
    { type: "html", html: "<p style='text-align:center;padding:12px;color:#52525b'>Bloc HTML liber</p>" },
    { type: "bogus", foo: 1 },
    { type: "button", text: "Link nesigur", href: "javascript:alert(1)" },
    { type: "sticky_footer", text: "Comandă acum — plată la livrare", href: "#comanda", bg: "#ff6b35", color: "#ffffff" },
  ],
};
