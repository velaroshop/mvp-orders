-- Pagina proprie SlimGel: conținutul paginii reduxio.ro/products/slimgel (șablonul slimgel-oldstyle), în blocuri.
-- Formularul folosește landing page-ul 'goldfoil' (produs în modul testing), deci comenzile sunt de test.
-- Ca să ia comenzi reale, schimbă "landingSlug" din blocul "form" în 'slimgel' (vezi nota din chat).
insert into landing_page_content (organization_id, slug, title, background, blocks, status)
values (
  (select organization_id from landing_pages where slug = 'goldfoil' limit 1),
  'slimgel-test',
  'SlimGel',
  '#ffffff',
  '[
 {
  "type": "topbar",
  "text": "Plată la livrare · Livrare 1-3 zile",
  "bg": "#202020",
  "color": "#ffffff"
 },
 {
  "type": "image",
  "src": "https://cdn.shopify.com/s/files/1/0940/8787/2897/files/e58d5d53332658c7ece3e69bd53b48a2_q60.webp?v=1792054029",
  "alt": "Gel termic SlimGel",
  "width": 1080,
  "height": 1080,
  "rounded": false
 },
 {
  "type": "text",
  "text": "SlimGel - slăbește rapid",
  "align": "center",
  "size": "2xl",
  "bold": true,
  "color": "#222222"
 },
 {
  "type": "text",
  "text": "Topește grăsimea localizată de pe abdomen și coapse",
  "align": "center",
  "size": "lg",
  "color": "#333333"
 },
 {
  "type": "list",
  "icon": "check",
  "iconColor": "#22a845",
  "color": "#222222",
  "size": "base",
  "items": [
   "**Elimină celulita și grăsimea abdominală**",
   "**Tonifică pielea moale și lăsată**",
   "**Accelerează metabolismul celular**",
   "**Se încălzește dar nu arde pielea**",
   "**Plătești doar când primești coletul**"
  ]
 },
 {
  "type": "image",
  "src": "https://cdn.shopify.com/s/files/1/0940/8787/2897/files/ezgif.com-webp-maker_2_q30.webp?v=1791537840",
  "alt": "Gel termic SlimGel",
  "width": 600,
  "height": 600,
  "rounded": false
 },
 {
  "type": "text",
  "text": "Când trebuie să folosești SlimGel?",
  "align": "center",
  "size": "2xl",
  "bold": true,
  "color": "#222222"
 },
 {
  "type": "list",
  "icon": "dot",
  "iconColor": "#222222",
  "color": "#222222",
  "size": "base",
  "items": [
   "**Vrei să slăbești rapid și fără efort**",
   "**Ai grăsime abdominală și colăcei în zona taliei**",
   "**Ai celulită pe fund sau pe picioare**",
   "**Ai retenție de apă**",
   "**Ai metabolismul greoi sau blocat**",
   "**Nu poți ține diete sau nu poți lua pastile**",
   "**Nu poți face sport**"
  ]
 },
 {
  "type": "image",
  "src": "https://cdn.shopify.com/s/files/1/0940/8787/2897/files/ezgif.com-video-to-webp-converter_4.webp?v=1792141399",
  "alt": "Înainte și după SlimGel",
  "width": 480,
  "height": 480,
  "rounded": false
 },
 {
  "type": "text",
  "text": "Rezultate vizibile după 2 săptămâni",
  "align": "center",
  "size": "2xl",
  "bold": true,
  "color": "#222222"
 },
 {
  "type": "list",
  "icon": "check",
  "iconColor": "#22a845",
  "color": "#222222",
  "size": "base",
  "items": [
   "**Kilogramele încep să scadă**",
   "**Celulita începe să nu se mai vadă**",
   "**Abdomen cu aspect mai tonifiat**",
   "**Grăsimea abdominală se diminuează**",
   "**Apa este eliminată iar metabolismul este activat**",
   "**Hainele rămân mari**"
  ]
 },
 {
  "type": "image",
  "src": "https://cdn.shopify.com/s/files/1/0940/8787/2897/files/ezgif.com-resize.webp?v=1791490073",
  "alt": "Gel termic SlimGel",
  "width": 600,
  "height": 600,
  "rounded": false
 },
 {
  "type": "text",
  "text": "Care e secretul SlimGel?",
  "align": "center",
  "size": "2xl",
  "bold": true,
  "color": "#222222"
 },
 {
  "type": "list",
  "icon": "dot",
  "iconColor": "#222222",
  "color": "#222222",
  "size": "base",
  "items": [
   "**Arginină -** Stimulează microcirculația locală",
   "**Extract de drojdie -** Ajută la netezirea vizibilă a aspectului de coajă de portocală.",
   "**Colagen -** Redă elasticitate, pentru o piele mai fermă și mai compactă.",
   "**Glicerină -** Ajută la menținerea hidratării pielii și o face mai catifelată și suplă."
  ]
 },
 {
  "type": "form",
  "landingSlug": "goldfoil",
  "org": "reduxio-srl",
  "thankYouPath": "/thank-you"
 },
 {
  "type": "text",
  "text": "Ce spun clienții noștri",
  "align": "center",
  "size": "2xl",
  "bold": true,
  "color": "#1c1e21"
 },
 {
  "type": "text",
  "text": "Experiențe împărtășite de clienții care au încercat produsul.",
  "align": "center",
  "size": "sm",
  "color": "#65676b"
 },
 {
  "type": "reviews",
  "title": "",
  "showRating": false,
  "items": [
   {
    "name": "Maria Donțu",
    "text": "Am comandat după ce am văzut reclama și sunt foarte mulțumită. Produsul a ajuns repede și îl folosesc deja de ceva timp.",
    "avatar": "https://cdn.shopify.com/s/files/1/0940/8787/2897/files/fb21.webp?v=1789408862"
   },
   {
    "name": "Elena Crețu",
    "text": "La început am fost puțin sceptică, dar am zis să încerc. Pentru mine a fost o alegere foarte bună și am mai comandat încă unul.",
    "avatar": "https://cdn.shopify.com/s/files/1/0940/8787/2897/files/fb11.webp?v=1789408862"
   },
   {
    "name": "Ana Marinescu",
    "text": "am trecut de la măsura L la masura M in mai putin de 5 saptamani. nu ma gandeam, dar chiar functioneaza",
    "avatar": "https://cdn.shopify.com/s/files/1/0940/8787/2897/files/fb9.webp?v=1789408862"
   },
   {
    "name": "Cristina Dumitru",
    "text": "Am recomandat produsul și unei prietene. Suntem foarte mulțumite de acest gel și de experiența de până acum. Am dat jos câteva kilograme și nu mă opresc aici",
    "avatar": "https://cdn.shopify.com/s/files/1/0940/8787/2897/files/fb14.webp?v=1789408862"
   }
  ]
 },
 {
  "type": "faq",
  "title": "Întrebări frecvente",
  "openFirst": false,
  "accent": "#333333",
  "items": [
   {
    "q": "Cum se folosește SlimGel?",
    "a": "Se aplică o cantitate potrivită pe pielea curată (abdomen, talie, coapse sau fese) și **se masează intens, prin mișcări circulare, timp de aproximativ 10 minute**, până când gelul este complet absorbit. Pentru rezultate maxime, se recomandă aplicarea imediat după o baie fierbinte sau după aplicarea unei comprese calde, când porii sunt complet deschiși."
   },
   {
    "q": "Este normal să simt căldură? De ce nu ustură?",
    "a": "Da, este absolut normal și reprezintă dovada că produsul lucrează! Spre deosebire de cremele agresive cu ardei iute care produc arsuri chimice pe piele, SlimGel folosește **Arginină**. Acest aminoacid activează o căldură biologică plăcută, din interior, prin dilatarea naturală a vaselor de sânge în timpul masajului. Pielea se încălzește și se relaxează în siguranță, fără usturimi neplăcute."
   },
   {
    "q": "Cum ajută la remodelarea abdomenului și a taliei?",
    "a": "SlimGel acționează prin două mecanisme clare: în timp ce masajul combinat cu Arginina elimină retenția de apă și lichidele stagnante care umflă burtica, **Colagenul pur** creează o peliculă fină de strângere la suprafață. Aceasta oferă pielii lăsate un efect instant de fermitate și un aspect mult mai compact (efect de corset natural)."
   },
   {
    "q": "Ce efect are asupra celulitei (cojii de portocală)?",
    "a": "Datorită ingredientului premium **Yeast Extract (Extract de Drojdie)**, gelul accelerează reînnoirea și metabolismul celular direct la suprafața pielii. Acesta netezește denivelările create de celulită, lasă pielea extrem de catifelată și elimină aspectul pufos încă de la primele utilizări."
   },
   {
    "q": "Ce cantitate conține un tub?",
    "a": "Un tub de SlimGel are un gramaj de **60g (2.12 OZ)**. Formula sa curată de hidrogel transparent se întinde excelent și se absoarbe rapid, fiind necesară doar o cantitate moderată la fiecare masaj de 10 minute."
   },
   {
    "q": "Este potrivit pentru persoanele cu piele sensibilă?",
    "a": "Da. Deoarece formula are doar 6 ingrediente și este complet lipsită de iritanți chimici agresivi sau extract de capsicum (ardei iute), riscul de iritații extreme sau alergii este eliminat. Pentru o siguranță deplină, recomandăm întotdeauna testarea gelului pe o suprafață mică de piele înainte de prima utilizare completă."
   },
   {
    "q": "Cum se face plata și livrarea?",
    "a": "Livrarea se face rapid prin curier, direct la ușa dumneavoastră. **Plata se face exclusiv ramburs (la livrare)**, în momentul în care primiți coletul și aveți produsul în mână. Nu este necesar niciun card online."
   }
  ]
 },
 {
  "type": "text",
  "text": "Ce conține SLIMGEL?",
  "align": "center",
  "size": "xl",
  "bold": true,
  "color": "#111111"
 },
 {
  "type": "text",
  "text": "O formulă minimalistă și curată, special concepută pentru a activa fermitatea pielii și drenajul limfatic prin masaj.",
  "align": "center",
  "size": "sm",
  "color": "#444444"
 },
 {
  "type": "faq",
  "title": "",
  "openFirst": false,
  "accent": "#ff4500",
  "items": [
   {
    "q": "🔍 Vezi lista de ingrediente și acțiunea lor",
    "a": "**Arginine (Arginină):** Secretul efectului termic. Este un aminoacid esențial care stimulează puternic microcirculația locală în timpul masajului. Dilată vasele periferice, aducând un aflux de sânge ce generează senzația intensă de căldură și relaxare celulară.\n\n**Yeast Extract (Extract de Drojdie):** Un ingredient premium recunoscut pentru stimularea metabolismului celular la suprafața pielii. Ajută la retexturarea epidermei și netezește vizibil aspectul denivelat de „coajă de portocală” al celulitei.\n\n**Collagen (Colagen):** Acționează ca un agent natural de tensionare la suprafața pielii. Pe măsură ce gelul se absoarbe, colagenul creează o peliculă fină cu efect de tightening, oferind fermitate instantanee și un aspect mai compact.\n\n**Glycerin (Glicerină):** Un umectant clasic excelent care reține apa în straturile superficiale ale pielii, asigurând o hidratare profundă și lăsând țesutul catifelat după masaj.\n\n**Carbomer:** Agentul responsabil pentru textura curată și transparentă de hidrogel. Permite o alunecare optimă la masaj și o absorbție rapidă, fără a lăsa o peliculă grasă sau lipicioasă.\n\n**Aqua (Apă):** Baza hidrică esențială care fluidizează formula și asigură transportul rapid al ingredientelor active direct în bariera cutanată."
   }
  ]
 },
 {
  "type": "html",
  "html": "<div style=\"margin:12px 16px;padding:14px;border-radius:16px;border:1px solid rgba(255,90,0,.25);background:#fff7f2;text-align:center;font-family:system-ui,sans-serif;color:#222\"><div style=\"font-weight:900;font-size:12px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px\">Important: SlimGel este un produs cosmetic</div><div style=\"font-size:13px;line-height:1.45\">Prin plasarea comenzii confirm că sunt de acord cu <br><a href=\"https://reduxio.ro/pages/politica-de-returnare-a-produselor-cosmetice\" style=\"color:#c2410c;font-weight:900;text-decoration:underline\">politica de retur pentru produse cosmetice</a><br> și înțeleg că produsele desigilate sau utilizate nu pot fi returnate.</div></div>"
 },
 {
  "type": "footer",
  "logo": {
   "src": "https://cdn.shopify.com/s/files/1/0940/8787/2897/files/ezgif.com-resize_1.webp?v=1791533619",
   "alt": "Reduxio Logo",
   "width": 48
  },
  "company": "REDUXIO\nReduceri la reduceri!\n\nCONTACT\nPentru informații despre comenzi sau produse\ncontact@reduxio.ro",
  "links": [
   {
    "label": "Politica de retur produse cosmetice",
    "href": "https://reduxio.ro/pages/politica-de-returnare-a-produselor-cosmetice"
   },
   {
    "label": "Politica generală de retur",
    "href": "https://www.reduxio.ro/pages/politica-de-retur"
   },
   {
    "label": "Termeni și condiții",
    "href": "https://reduxio.ro/pages/termeni-si-conditii"
   }
  ],
  "showAnpc": true,
  "badges": [],
  "copyright": "",
  "bg": "#ffffff",
  "color": "#444444"
 },
 {
  "type": "sticky_footer",
  "text": "COMANDĂ ACUM  →",
  "href": "#comanda",
  "bg": "#0bba71",
  "color": "#ffffff"
 }
]'::jsonb,
  'published'
);
