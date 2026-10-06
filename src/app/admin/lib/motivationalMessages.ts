export type DayKey = "luni" | "marti" | "miercuri" | "joi" | "vineri" | "sambata" | "duminica";
export type PeriodKey = "dimineata" | "pranz" | "dupa-amiaza" | "seara" | "noapte";

export const messages: Record<DayKey, Record<PeriodKey, string[]>> = {
  luni: {
    dimineata: [
      "Luni, dar cu cafea. Săptămâna asta pornește cu tine la volan.",
      "Pagină nouă, săptămână nouă. Primul rând îl scrii tu.",
      "Comenzile din weekend te așteaptă. Le iei pe rând și le termini zâmbind.",
      "Lunea e grea doar pentru cei care n-au un plan. Tu ai.",
      "Bună dimineața! Azi pui fundația pentru o săptămână de toată frumusețea.",
    ],
    pranz: [
      "Ai supraviețuit dimineții de luni. Meriți o masă ca lumea.",
      "Pauză de prânz: bateriile la încărcat, comenzile la coadă.",
      "Jumătate de luni e deja istorie. Restul e floare la ureche.",
      "Mănâncă ceva bun. Campaniile pot sta cuminți o jumătate de oră.",
      "Prânzul de luni e dovada că săptămâna se poate. Poftă bună!",
    ],
    "dupa-amiaza": [
      "După-amiaza de luni e momentul în care prinzi ritmul. Ține-l.",
      "Coada de comenzi scade, încrederea crește. Exact cum trebuie.",
      "Încă un sprint și lunea devine o zi bifată cu stil.",
      "Cifrele de azi încep să zâmbească. Și tu ar trebui.",
      "Ai pornit motorul săptămânii. Acum doar apeși ușor pe accelerație.",
    ],
    seara: [
      "Prima zi din săptămână: bifată. Nu-i rău deloc pentru o luni.",
      "Ai dus lunea la capăt. Restul săptămânii abia așteaptă.",
      "Seara de luni e pentru tine. Comenzile se descurcă și singure o vreme.",
      "Ai pus temelia. Mâine construim etajul.",
      "Lunea s-a încheiat cu un scor bun. Fă-ți ceva frumos în seara asta.",
    ],
    noapte: [
      "E târziu și e luni. Ai câștigat oficial titlul de MVP al săptămânii.",
      "Încă pe aici? Lasă și puțină energie pentru marți.",
      "Noaptea liniștită e perfectă pentru ultimele bife. Apoi la somn.",
      "Comenzile dorm, campaniile rulează. Poți să închizi ochii fără griji.",
      "Marțea te vrea cu energie. Ultima verificare și noapte bună.",
    ],
  },

  marti: {
    dimineata: [
      "Marți: lunea a trecut, weekendul se vede la orizont. Ce poate fi mai bine?",
      "Bună dimineața! Azi ai deja ritm, doar îl duci mai departe.",
      "Azi e ziua în care lucrurile încep să meargă singure. Aproape.",
      "Cafeaua e gata, tu ești gata. Comenzile n-au nicio șansă.",
      "Marțea e ziua oamenilor care fac treabă fără zgomot. Adică a ta.",
    ],
    pranz: [
      "Pauză binemeritată. Dimineața ai tras tare.",
      "La prânz se încarcă bateriile și se nasc ideile bune.",
      "Marți la prânz: nici prea devreme, nici prea târziu. Exact cât să te bucuri de masă.",
      "Lasă tab-urile deschise și mergi să mănânci. Te așteaptă cuminți.",
      "Jumătate de marți, zero panică. Așa arată o zi bună.",
    ],
    "dupa-amiaza": [
      "După-amiaza de marți e terenul tău de joacă. Hai să închidem câteva comenzi frumos.",
      "Echipa merge, campaniile merg, tu conduci. Bravo.",
      "Încă puțin și marțea intră la capitolul zile reușite.",
      "Fiecare comandă confirmată e un client mulțumit. Și ai mulți azi.",
      "Ritmul de marți: constant, sigur, al tău.",
    ],
    seara: [
      "Marți bifată. Săptămâna începe să arate foarte bine.",
      "Ai făcut azi mai mult decât crezi. Seara asta e a ta.",
      "Închide laptopul cu mândrie. Mâine e jumătatea săptămânii.",
      "Două zile din cinci, ambele câștigate. Scorul e de partea ta.",
      "Seară liniștită după o zi plină. Exact cum trebuie.",
    ],
    noapte: [
      "E noapte și tu încă bifezi. Respect, dar și somnul e productivitate.",
      "Miercurea vine repede. Las-o să te găsească cu bateriile pline.",
      "Liniște, cifre, o ultimă privire. Apoi pernă.",
      "Ce n-ai terminat azi termini mâine, cu cafea și chef.",
      "Noapte bună! Comenzile te așteaptă dimineață, la fel de cuminți.",
    ],
  },

  miercuri: {
    dimineata: [
      "Miercuri! Ai urcat jumătate din munte. Priveliștea de aici e superbă.",
      "Jumătatea săptămânii începe acum. Și începe bine.",
      "Bună dimineața! Azi e ziua perfectă să depășești ce ai făcut luni.",
      "Miercurea e puntea spre weekend. Hai s-o traversăm cu stil.",
      "Cafea, dashboard, zâmbet. Ordinea nu contează.",
    ],
    pranz: [
      "Miercuri la prânz: exact mijlocul săptămânii. De-acum e coborâș lin.",
      "Ia o pauză. Comenzile nu fug nicăieri.",
      "Mijlocul zilei, mijlocul săptămânii, energie din plin. Matematica e de partea ta.",
      "Masa de prânz e cel mai important KPI de azi. Bifează-l.",
      "O pauză scurtă acum înseamnă o după-amiază cu viteză.",
    ],
    "dupa-amiaza": [
      "Ai trecut de cocoașa săptămânii. Totul pare mai ușor de aici.",
      "După-amiaza de miercuri e pentru decizii bune. Ai deja câteva în minte.",
      "Campaniile au prins viteză, la fel și tu.",
      "Încă puțin și miercurea e în buzunar.",
      "Fiecare status actualizat e un pas spre o seară liniștită.",
    ],
    seara: [
      "Jumătate de săptămână, toată câștigată. Felicitări!",
      "Miercuri bifată. Weekendul tocmai s-a apropiat cu o zi.",
      "Ai muncit frumos azi. Seara asta te răsplătești.",
      "De mâine începe linia dreaptă. Odihnește-te bine.",
      "Seara de miercuri e pauza dintre două reprize câștigate.",
    ],
    noapte: [
      "E târziu, dar ai trecut de jumătate. Restul merge mai ușor după un somn.",
      "Ultimele verificări și gata. Joia are nevoie de tine în formă.",
      "Noaptea e pentru planuri mari și somn bun. În ordinea asta.",
      "Ce ai construit azi rămâne. Acum lasă-te să te odihnești.",
      "Ecranul se poate stinge. Tu ai strălucit suficient azi.",
    ],
  },

  joi: {
    dimineata: [
      "Joi! Weekendul e deja la două zile distanță. Se simte, nu?",
      "Bună dimineața! Azi e ziua în care se văd rezultatele săptămânii.",
      "Joia e vinerea celor care nu mai au răbdare. Hai că se poate.",
      "Dimineață nouă, energie de penultimă zi. Folosește-o din plin.",
      "Comenzile vin, tu ești gata. Începem.",
    ],
    pranz: [
      "Joi la prânz, iar vinerea deja face cu mâna. Poftă bună!",
      "Pauză scurtă, idei lungi. Poate chiar campania următoare.",
      "Ai tras tare până acum. Mâncarea e binemeritată.",
      "Jumătate de joi rezolvată. Și ce bine merge.",
      "Prânzul e momentul să te uiți înapoi la dimineață și să zâmbești.",
    ],
    "dupa-amiaza": [
      "Ultima după-amiază lungă a săptămânii. Fă-o să conteze.",
      "Joia după-amiaza e pentru închis bucle. Una câte una.",
      "Echipa ține ritmul, tu ții direcția. Combinație câștigătoare.",
      "Cifrele de joi spun o poveste bună. Continuă!",
      "Încă un efort și mâine e vineri. Aproape că se aude weekendul.",
    ],
    seara: [
      "Joi bifată. Mâine e vineri, iar tu ai pregătit terenul.",
      "Patru zile din cinci. Ești pe ultima sută de metri.",
      "Seara de joi miroase a weekend. Bucură-te de ea.",
      "Ai dus greul săptămânii. Mâine e doar finisaj.",
      "Relaxează-te, mâine e ziua preferată a tuturor.",
    ],
    noapte: [
      "E noapte și mâine e vineri. Motiv excelent să mergi la somn chiar acum.",
      "Vinerea e la un somn distanță. Hai la culcare.",
      "Ultima noapte din săptămâna de lucru. Las-o pentru odihnă.",
      "Comenzile de mâine se rezolvă mai ușor cu un somn bun azi.",
      "Mai e o singură zi. Noaptea asta e pentru încărcat bateriile.",
    ],
  },

  vineri: {
    dimineata: [
      "E vineri! Dimineața asta are alt gust, nu-i așa?",
      "Ultima zi de lucru, cel mai bun moment să închei săptămâna în forță.",
      "Bună dimineața și vineri fericită! Azi totul merge mai ușor.",
      "Vinerea e ziua în care chiar și comenzile par mai vesele.",
      "Ultima linie dreaptă. Azi termini săptămâna cu fruntea sus.",
    ],
    pranz: [
      "Vineri la prânz: jumătate din ultima zi deja în spate.",
      "Pauza de vineri are alt gust. Savureaz-o.",
      "Weekendul e la câteva ore distanță. Poftă bună și spor!",
      "Ia masa fără grabă, după-amiaza de vineri trece în zbor.",
      "Bilanțul săptămânii arată bine. Prânzul ăsta e un mic premiu.",
    ],
    "dupa-amiaza": [
      "Ultimele comenzi ale săptămânii. Închide-le frumos, ca pe un cadou.",
      "Încă câteva ore și weekendul e oficial al tău.",
      "Verifică bugetele de weekend și apoi respiră. Ai făcut treabă bună.",
      "Vineri după-amiaza: când fiecare bifă se simte dublu de bine.",
      "Săptămâna asta a fost a ta. Mai ai doar de pus semnătura.",
    ],
    seara: [
      "Weekendul a început oficial. Meriți fiecare minut din el.",
      "O săptămână întreagă câștigată. Acum închide și bucură-te.",
      "Campaniile rulează, tu te relaxezi. Așa se face.",
      "Vineri seara: momentul să sărbătorești tot ce ai realizat.",
      "Lasă laptopul și ieși în oraș. Sau pe canapea. Ambele variante sunt câștigătoare.",
    ],
    noapte: [
      "E vineri noaptea și tu încă aici? Weekendul te strigă.",
      "Comenzile pot aștepta până luni. Tu nu trebuie să mai aștepți nimic.",
      "Ultima verificare și gata, săptămâna e închisă oficial.",
      "Noaptea de vineri e pentru povești bune, nu pentru tabele.",
      "Ai muncit o săptămână întreagă. Acum dormi cât vrei.",
    ],
  },

  sambata: {
    dimineata: [
      "Sâmbătă dimineață și tu tot aici. Dedicare de nivel înalt.",
      "E weekend, dar comenzile n-au aflat. Bine că ești tu pe fază.",
      "Bună dimineața! Azi lucrezi în ritmul tău. Fără grabă.",
      "Sâmbăta e perfectă pentru o privire liniștită peste cifre.",
      "Clienții cumpără și în weekend. Tu ești acolo pentru ei. Respect.",
    ],
    pranz: [
      "Prânz de sâmbătă: fără ședințe, doar mâncare bună.",
      "E weekend, deci pauza poate fi mai lungă. Nu spunem nimănui.",
      "Jumătate de sâmbătă productivă. Restul e pentru tine.",
      "Poftă bună! Comenzile de weekend se descurcă o oră fără tine.",
      "Sâmbăta la prânz e cel mai bun moment să uiți de dashboard.",
    ],
    "dupa-amiaza": [
      "Sâmbătă după-amiaza. Dacă tot ești aici, fă-o scurt și ieși la soare.",
      "Câteva bife rapide și ziua e liberă. Merită.",
      "Comenzile de weekend curg frumos. Tu poți să te relaxezi.",
      "Cine lucrează sâmbăta construiește lucruri mari. Dar și odihna construiește.",
      "O verificare rapidă, apoi weekendul continuă.",
    ],
    seara: [
      "Sâmbătă seara. Închide tot, deschide distracția.",
      "Săptămâna a fost bună, weekendul trebuie să fie și mai bun.",
      "Campaniile au grijă de vânzări. Tu ai grijă de seara ta.",
      "Seara asta e pentru oamenii dragi, nu pentru notificări.",
      "Ai verificat? Perfect. Acum e timpul pentru tine.",
    ],
    noapte: [
      "Sâmbătă noaptea și tu cu comenzile? Ești o legendă, dar și legendele dorm.",
      "Noaptea de weekend nu e pentru rapoarte. Închide și relaxează-te.",
      "Comenzile de mâine pot aștepta. Somnul de azi nu.",
      "Ultima privire și gata. Duminica merită să înceapă fără grabă.",
      "Mai e o zi de weekend. Las-o să înceapă cu un somn bun.",
    ],
  },

  duminica: {
    dimineata: [
      "Duminică dimineață. Cafeaua se bea încet azi.",
      "Bună dimineața! O zi liniștită e și ea o zi reușită.",
      "Dacă tot ai intrat, aruncă o privire și apoi bucură-te de duminică.",
      "Duminica e pentru încărcat bateriile. Restul poate aștepta.",
      "Comenzile din weekend se adună frumos. Mâine le dai de capăt.",
    ],
    pranz: [
      "Prânz de duminică: cel mai important eveniment al zilei.",
      "Masa în familie bate orice raport. Poftă bună!",
      "Duminica la prânz nu se lucrează, se savurează.",
      "Ai muncit toată săptămâna. Prânzul ăsta e premiul tău.",
      "Lasă telefonul și mai ia o porție. E duminică.",
    ],
    "dupa-amiaza": [
      "Duminică după-amiaza: momentul perfect pentru o plimbare, nu pentru un tabel.",
      "O privire rapidă peste săptămâna care vine și gata.",
      "Planifici puțin acum, câștigi mult luni. Dar doar puțin.",
      "Liniștea de duminică e combustibilul săptămânii viitoare.",
      "Campaniile pentru luni se pot pregăti și cu o cafea în mână.",
    ],
    seara: [
      "Mâine începe o săptămână nouă și ai toate motivele să fie cea mai bună de până acum.",
      "Seara de duminică e pentru pregătire liniștită, nu pentru griji.",
      "Ai încheiat o săptămână bună. Următoarea poate fi și mai bună.",
      "Fă-ți un plan mic pentru mâine și apoi relaxează-te.",
      "Lunea nu e un dușman, e doar un nou început. Și tu ești în formă.",
    ],
    noapte: [
      "E duminică noaptea. Lunea vine oricum, mai bine te găsește cu energie.",
      "Somn bun! Mâine pornești săptămâna cu totul de partea ta.",
      "Ultima verificare a weekendului. Apoi la culcare, că mâine e zi mare.",
      "Noapte liniștită, dimineață productivă. Așa se face.",
      "O săptămână nouă te așteaptă. Odihnește-te pentru ea.",
    ],
  },
};

export function getMotivationalMessage(): string {
  const now = new Date();
  const hour = now.getHours();
  const dayIndex = now.getDay(); // 0 = Sunday

  const dayMap: DayKey[] = [
    "duminica",
    "luni",
    "marti",
    "miercuri",
    "joi",
    "vineri",
    "sambata",
  ];

  let period: PeriodKey;
  if (hour >= 5 && hour < 12) period = "dimineata";
  else if (hour >= 12 && hour < 14) period = "pranz";
  else if (hour >= 14 && hour < 18) period = "dupa-amiaza";
  else if (hour >= 18 && hour < 22) period = "seara";
  else period = "noapte";

  const day = dayMap[dayIndex];
  const pool = messages[day][period];
  return pool[Math.floor(Math.random() * pool.length)];
}
