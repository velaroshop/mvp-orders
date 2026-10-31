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
    {
      type: "reviews",
      title: "Ce spun clienții",
      items: [
        { name: "Maria P.", text: "Mi-a plăcut mult, **l-am recomandat** și vecinei.", rating: 5, verified: true },
        { name: "Ion D.", text: "Livrare rapidă, plătit la curier.", rating: 4 },
      ],
    },
    {
      type: "faq",
      title: "Întrebări frecvente",
      openFirst: true,
      items: [
        { q: "Cum plătesc?", a: "Plătești la livrare, direct curierului." },
        { q: "În cât timp ajunge coletul?", a: "În 1-3 zile lucrătoare." },
      ],
    },
    {
      type: "gallery",
      images: [
        { src: "https://placehold.co/800x600/0ea5e9/ffffff.png?text=1", alt: "Poza 1" },
        { src: "https://placehold.co/800x600/22c55e/ffffff.png?text=2", alt: "Poza 2" },
        { src: "https://placehold.co/800x600/a855f7/ffffff.png?text=3", alt: "Poza 3" },
      ],
    },
    {
      type: "before_after",
      before: { src: "https://placehold.co/600x800/71717a/ffffff.png?text=Inainte", alt: "Înainte" },
      after: { src: "https://placehold.co/600x800/16a34a/ffffff.png?text=Dupa", alt: "După" },
    },
    { type: "spacer", height: 16 },
    { type: "bogus", foo: 1 },
    { type: "button", text: "Link nesigur", href: "javascript:alert(1)" },
    {
      type: "footer",
      logo: { src: "https://placehold.co/300x80/ffffff/18181b.png?text=LOGO", alt: "Logo", width: 150 },
      company: "SC Exemplu SRL\nCUI RO123456 · J00/000/2020\nStr. Exemplu 1, București",
      links: [
        { label: "Termeni și condiții", href: "/termeni" },
        { label: "Politica de confidențialitate", href: "/confidentialitate" },
        { label: "Politica de retur", href: "/retur" },
      ],
      showAnpc: true,
      badges: [{ src: "https://placehold.co/200x60/ffffff/18181b.png?text=ANPC", alt: "ANPC", href: "https://anpc.ro" }],
      copyright: "© 2026 SC Exemplu SRL. Toate drepturile rezervate.",
    },
    { type: "sticky_footer", text: "Comandă acum — plată la livrare", href: "#comanda", bg: "#ff6b35", color: "#ffffff" },
  ],
};
