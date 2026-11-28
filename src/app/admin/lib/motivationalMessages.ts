export type DayKey = "luni" | "marti" | "miercuri" | "joi" | "vineri" | "sambata" | "duminica";
export type PeriodKey = "dimineata" | "dupa-amiaza" | "seara";

export const messages: Record<DayKey, Record<PeriodKey, string[]>> = {
  luni: {
    dimineata: [
      "Ce ai face azi dacă ai avea puțin mai multă încredere în tine?",
      "Începe cu ce contează pentru tine, înainte să intre ziua pe mâna altora.",
      "Pune în calendar lucrul pe care vrei să-l vezi crescând.",
      "Dă-i unei idei bune zece minute din dimineața ta.",
      "Poți să ai emoții și să ridici mâna.",
      "Ce ai lăsat deoparte săptămâna trecută poate primi o șansă azi.",
      "Fă prima alegere a zilei cu gândul la cum vrei să te simți.",
      "Alege o promisiune mică pe care știi că ți-o poți ține.",
      "Poate că ai deja o parte din ce îți trebuie. Uită-te mai bine.",
      "Lasă-ți suficient timp să începi în ritmul tău.",
    ],
    "dupa-amiaza": [
      "Dacă te învârți în jurul aceleiași probleme, încearcă s-o spui într-o singură propoziție.",
      "Trimite mesajul care poate pune o idee în mișcare.",
      "Ai voie să schimbi ordinea lucrurilor când îți dai seama ce e urgent pentru tine.",
      "Cere o părere cât timp mai ai loc s-o folosești.",
      "Ia o pauză cât încă te poți bucura de ea.",
      "Fă ceva care să-i ușureze ziua omului care vei fi mâine.",
      "Spune „am nevoie de timp” înainte să răspunzi din grabă.",
      "Adu înapoi în plan partea care te entuziasma la început.",
      "Uită-te la ce ai la îndemână când cauți o soluție.",
      "Lasă lucrurile care mai pot aștepta să aștepte.",
    ],
    seara: [
      "Unde ai avut azi mai multă răbdare decât de obicei?",
      "Pune deoparte un gând bun din ziua asta. S-ar putea să-ți prindă bine mâine.",
      "Când se termină programul, fă ceva care îți amintește că seara îți aparține.",
      "Uită-te la ce ai dus cu blândețe, chiar dacă ți-a fost greu.",
      "Lasă o decizie grea pentru momentul în care vei avea mintea limpede.",
      "Ce ai aflat azi despre felul în care îți place să lucrezi?",
      "Primește complimentul pe care l-ai trecut prea repede cu vederea.",
      "O cină în liniște poate fi cel mai bun lucru dintr-o zi plină.",
      "Spune-i cuiva apropiat ce te-a bucurat azi.",
      "Lasă-ți corpul să se relaxeze înainte să-ți faci ordine în gânduri.",
    ],
  },
  marti: {
    dimineata: [
      "Alege o sarcină care te învață ceva ce vei mai folosi.",
      "Inspiră-te din reușita cuiva și vezi ce poți încerca în felul tău.",
      "Încearcă azi o variantă pe care până acum doar ai luat-o în calcul.",
      "Poți să ceri mai mult când înțelegi mai bine ce aduci.",
      "Curiozitatea te poate duce într-un loc în care rutina trece pe lângă tine.",
      "Alege un loc în care ți-ar prinde bine să fii mai vizibil.",
      "Întreabă-te ce ți-ar face munca mai plăcută chiar de azi.",
      "Dacă vrei să devii mai bun la ceva, fă-i un loc printre lucrurile obișnuite.",
      "Ce ți-ar plăcea să poți spune la prânz că ai încercat?",
      "Spune clar ce vrei să obții. S-ar putea să vezi mai repede ce te poate ajuta.",
    ],
    "dupa-amiaza": [
      "Când te blochezi, schimbă întrebarea pe care încerci s-o rezolvi.",
      "Lasă pe cineva să te ajute acolo unde ai obiceiul să te descurci singur.",
      "Spune ce crezi într-o conversație în care de obicei taci.",
      "Dacă ai găsit o metodă mai simplă, folosește-o.",
      "Fă o încercare de care să te poți folosi chiar dacă rezultatul te surprinde.",
      "Împarte o reușită cu un om care știe cât ai muncit pentru ea.",
      "Cere un exemplu când o explicație rămâne neclară.",
      "Dacă un lucru merge bine, observă concret ce ai făcut ca să meargă.",
      "Dă un termen realist unui lucru pe care vrei să-l faci bine.",
      "Oferă o mână de ajutor acolo unde pentru tine e simplu și pentru altcineva contează.",
    ],
    seara: [
      "Ce ai făcut azi cu mai multă ușurință decât îți aminteai?",
      "Gândește-te la cine te-a făcut să te simți ascultat.",
      "Ai voie să te bucuri de o reușită înainte să-i cauți urmarea.",
      "Ce ți-a dat energie azi și ai vrea să repeți?",
      "Dacă te-ai răzgândit după ce ai aflat mai multe, recunoaște-ți meritul.",
      "Oferă-ți câteva minute în care să lași telefonul deoparte și să simți că ai ajuns acasă.",
      "Adu-ți aminte unde ai ales să-ți spui părerea chiar dacă îți bătea inima mai tare.",
      "Ce ți-ar fi făcut ziua mai ușoară dacă ți-ai fi spus-o de dimineață?",
      "Bucură-te de ceva frumos pe care l-ai primit azi.",
      "Lasă-te prins de o carte, o melodie sau o conversație care îți face bine.",
    ],
  },
  miercuri: {
    dimineata: [
      "La jumătatea săptămânii, încă ai timp să schimbi ceva ce te încurcă.",
      "Întreabă-te ce ți-ai permite să vrei dacă ai avea unde să începi.",
      "Fă loc unei idei care te-a surprins chiar pe tine.",
      "Gândește-te la un lucru pe care azi îl poți face fiindcă ai exersat ieri.",
      "Dă-ți voie să fii începător la ceva care îți place.",
      "Fă un drum scurt pe jos și vezi ce gând îți rămâne după ce se liniștește graba.",
      "Uită-te în jur după oameni cu care ți-ar plăcea să construiești ceva.",
      "Când ai mai multe opțiuni, observă la care revii cu plăcere.",
      "Deschide agenda și păstrează un interval pentru o idee fără termen.",
      "Ai voie să-ți placă o viață care arată altfel decât ai planificat.",
    ],
    "dupa-amiaza": [
      "Spune cuiva ce ți-a plăcut la munca lui. O apreciere concretă rămâne.",
      "Fă o propunere înainte să presupui ce răspuns vei primi.",
      "Dacă vrei să câștigi timp, vezi ce poți face o singură dată și folosi de mai multe ori.",
      "Lasă ultimele zece minute ale unei întâlniri pentru întrebarea care contează.",
      "Când ai prea multe idei, începe cu cea pe care o poți pune azi în fața cuiva.",
      "Alege să fii prezent la masa de prânz. Lasă munca să se răcească puțin.",
      "Dacă ți se oferă ceva bun, exersează un simplu „mulțumesc”.",
      "Fă un lucru cu atenția întreagă și vezi cum te simți după.",
      "Schimbă decorul pentru o oră dacă ai nevoie de un gând proaspăt.",
      "Întreabă un om priceput cum ar începe el.",
    ],
    seara: [
      "Ce ți-a fost mai ușor după ce ai spus ce aveai pe suflet?",
      "Mulțumește-i corpului tău oferindu-i ceva de care chiar are nevoie în seara asta.",
      "Amintește-ți o alegere de azi care ți-a adus liniște.",
      "Uneori bogăția unei zile stă în cât de bine te-ai simțit în compania cuiva.",
      "Poți să lași o întrebare frumoasă deschisă peste noapte.",
      "Uită-te la ce ai primit azi fiindcă ai îndrăznit să ceri.",
      "Fă-ți patul primitor înainte ca oboseala să te ajungă din urmă.",
      "Ce ai făcut azi din plăcere și ai vrea să mai faci?",
      "Dacă o greșeală îți revine în minte, întreabă-te ce poți repara cu calm mâine.",
      "Găsește un motiv simplu să-ți placă locul în care ești acum.",
    ],
  },
  joi: {
    dimineata: [
      "Dă-i atenție lucrului care se îmbunătățește de fiecare dată când revii la el.",
      "Ce ai negocia altfel dacă ai pune la socoteală și timpul tău?",
      "Alege azi un obicei care îți face bine și când ai mult de lucru.",
      "Scrie ideea înainte să începi s-o judeci.",
      "Lasă un pic de spațiu între prima cafea și prima notificare.",
      "Caută ceva ce poți învăța de la omul pe care îl vei întâlni azi.",
      "Dacă un plan te atrage de mult, află cât te-ar costa în timp, bani sau energie.",
      "Fă loc în ziua ta pentru o discuție din care poți ieși cu mai multe opțiuni.",
      "Spune-ți ce ai vrea să auzi înainte de o zi importantă.",
      "Alege standardul care te ajută să lucrezi cu grijă și să poți continua și mâine.",
    ],
    "dupa-amiaza": [
      "Dacă ai depășit un obstacol, lasă-i cuiva o explicație care să-i scurteze drumul.",
      "Fă loc unei idei bune chiar dacă vine de unde te așteptai mai puțin.",
      "Întoarce-te la intenția inițială înainte să mai adaugi ceva pe listă.",
      "Când cere cineva mai mult decât poți oferi, spune ce ești disponibil să faci.",
      "Ridică-te de la birou și întreabă-te de ce ai nevoie în următoarea oră.",
      "Dacă îți place cum lucrează cineva, spune-i că ți-ar plăcea să faceți ceva împreună.",
      "Ia o idee complicată și încearcă s-o explici cu voce tare, pe înțelesul tău.",
      "Fă un loc clar pentru banii pe care vrei să-i păstrezi pentru ceva drag.",
      "Încheie o conversație grea cu o întrebare care vă ajută pe amândoi.",
      "Privește ce ai de făcut și scoate din listă un lucru care și-a pierdut rostul.",
    ],
    seara: [
      "Care a fost momentul în care te-ai simțit cel mai mult tu?",
      "Amintește-ți o alegere în care ai avut grijă și de tine, și de altcineva.",
      "Să știi când ți-a ajuns face parte din a trăi bine.",
      "Gândește-te la ceva ce ai înțeles abia după ce ți-ai dat timp.",
      "Observă câtă liniște îți poate da un lucru mic pus la locul lui.",
      "Poartă o conversație care începe cu „mi-a prins bine”.",
      "Alege mâine și după cum vrei să trăiești, și după ce ai promis că faci.",
      "Dă-ți voie să te simți mulțumit în mijlocul unui proiect care încă mai crește.",
      "Ține minte ajutorul primit azi când îți vine să crezi că duci totul singur.",
      "Dacă ai nevoie de tandrețe, începe cu felul în care îți vorbești.",
    ],
  },
  vineri: {
    dimineata: [
      "Ce vrei să închei azi ca să intri cu mintea liberă în weekend?",
      "Privește în urmă la săptămâna asta și ia cu tine o idee care a funcționat.",
      "Oferă-i unui lucru bun ultima jumătate de oră de care are nevoie.",
      "Spune direct ce apreciezi la oamenii cu care ai lucrat.",
      "Alege de dimineață ceva care să te bucure după program.",
      "Dacă ai lucrat în tăcere la ceva bun, arată-l unui om care îl poate folosi.",
      "Fă o alegere de care să te bucuri și după ce trece entuziasmul.",
      "Uită-te la ce ai putut să faci cu resursele pe care le-ai avut la începutul săptămânii.",
      "Pune în cuvinte ce ți-a făcut viața mai bună în ultimele zile.",
      "Cere detaliile unei oportunități care ți-a stârnit interesul.",
    ],
    "dupa-amiaza": [
      "Lasă o notiță suficient de clară încât luni să știi unde ai rămas.",
      "Folosește o parte din timpul câștigat pentru un lucru care îți face plăcere.",
      "Împacă-te cu o alegere după ce ai cântărit-o și ai făcut-o.",
      "Dacă ai vești bune, permite-ți să le spui cu bucurie.",
      "Închide o buclă mică. Dă răspunsul pe care cineva îl așteaptă.",
      "Recunoaște contribuția omului care ți-a ușurat munca săptămâna asta.",
      "Când simți că te grăbești să termini, verifică lucrul care va conta pentru cel care îl primește.",
      "Mută o promisiune în calendar, unde îi poți da timp pe bune.",
      "Uită-te dacă ai ceva bun în plus de împărțit, de la o idee la o oră liberă.",
      "Fă ultima treabă a zilei pe îndelete. Ai voie să închei fără grabă.",
    ],
    seara: [
      "Fă un toast pentru ceva frumos pe care l-ai făcut posibil săptămâna asta.",
      "Adu în seara asta obiceiul care te face să simți cel mai repede că e weekend.",
      "Întreabă-te care dintre problemele de luni s-a făcut mai mică între timp.",
      "Dacă ai puțin timp liber, începe prin a-l petrece așa cum îți place.",
      "Întâlnește-te cu omul lângă care poți să râzi de lucrurile mărunte.",
      "Bucură-te de un lucru pe care ți-l permiți acum datorită unei alegeri bune de mai demult.",
      "Poartă cu tine în weekend partea frumoasă a săptămânii.",
      "Lasă loc pentru o seară simplă dacă exact asta ți-ai dorit toată ziua.",
      "Pune o melodie pe care o asculți mereu până la capăt.",
      "Amintește-ți un moment în care ai avut mai mult curaj decât ți-ai dat seama atunci.",
    ],
  },
  sambata: {
    dimineata: [
      "Ce ai face azi din pură plăcere dacă ți-ai păstra prima oră liberă?",
      "Ieși să vezi ceva ce locul în care trăiești îți oferă deja.",
      "Dă-i unei pasiuni vechi o dimineață în care să vezi dacă încă te bucură.",
      "Alege un mic lux care chiar îți place, cum ar fi cafeaua băută cât e caldă.",
      "Fă ceva cu mâinile și bucură-te să vezi cum prinde formă.",
      "Lasă-i corpului tău câteva minute să se trezească în ritmul lui.",
      "Începe cu un lucru care îți dă chef de încă unul.",
      "Dă curs unei curiozități pe care ai tot amânat-o.",
      "Spune „da” unui plan care îți lasă loc să te simți bine.",
      "Împarte dimineața cu cineva cu care îți place și să taci.",
    ],
    "dupa-amiaza": [
      "Intră într-un loc nou și lasă-te surprins de ce îți atrage atenția.",
      "Gătește ceva care îți aduce aminte de o perioadă bună.",
      "O după-amiază petrecută afară îți poate schimba tonul întregii zile.",
      "Pune deoparte ceva frumos ce ai vrea să dăruiești.",
      "Stai suficient la masă cât să auzi povestea până la capăt.",
      "Dacă îți vine o idee pe drum, scrie-o și întoarce-te la plimbare.",
      "Joacă-te cu un plan pentru viitor fără să-i pui încă un termen.",
      "Alege un lucru din casă și fă-l să arate așa cum îți place ție.",
      "Când cineva te invită, întreabă-te dacă te-ar bucura să fii acolo.",
      "Pune-ți energia acolo unde simți că ți se întoarce sub formă de bucurie.",
    ],
    seara: [
      "Unde ai uitat azi să te uiți la ceas?",
      "Spune-i cuiva că te-ai bucurat să fii cu el.",
      "Păstrează în minte un detaliu al zilei pe care o fotografie l-ar fi ratat.",
      "Gândește-te ce ți-a plăcut la viața ta așa cum a fost ea azi.",
      "Râzi încă o dată de lucrul care v-a făcut să râdeți pe toți.",
      "Dacă liniștea îți place, stai cu ea puțin înainte să pornești ceva.",
      "Când un om îți face bine, dă-i de înțeles cât de mult contează.",
      "Ce ți-ar plăcea să devină o tradiție de sâmbătă?",
      "Observă cum te simți după o zi în care ai ales mai des ce îți place.",
      "Înainte să adormi, amintește-ți un lucru pe care l-ai făcut doar fiindcă ai avut chef.",
    ],
  },
  duminica: {
    dimineata: [
      "Întreabă-te ce fel de săptămână ți-ar plăcea să trăiești.",
      "Deschide geamul și petrece un minut cu lumea de afară înainte de orice plan.",
      "Fă loc azi unui lucru de care ți-a fost dor.",
      "Alege un lucru bun din ultimele zile pe care vrei să-l păstrezi aproape.",
      "Ce ai vrea să poți face cu mai multă liniște în perioada care vine?",
      "Stai puțin cu gândul la lucrurile pe care ți le doreai cândva și le ai acum.",
      "Sună un om a cărui voce îți face dimineața mai bună.",
      "Lasă-te inspirat de o pagină, un loc sau un om care îți lărgește perspectiva.",
      "Fă-ți un mic dejun pe care să-l aștepți cu plăcere.",
      "Poți să-ți alegi o direcție chiar dacă ai aflat doar primul lucru despre ea.",
    ],
    "dupa-amiaza": [
      "Lasă-ți ceva frumos de așteptat pentru o zi obișnuită din săptămâna viitoare.",
      "Pregătește un singur lucru care îți va îndulci dimineața de luni.",
      "Dacă ți-ai schimbat prioritățile, lasă și calendarul să arate asta.",
      "Uită-te ce ai putea învăța în următoarea lună dacă i-ai da câte puțin timp.",
      "Pune pe masă ceva de împărțit și invită-i pe cei de lângă tine să se așeze.",
      "Gândește-te la o cheltuială care ți-a adus bucurie și după ce ai făcut-o.",
      "Schimbă o parte din program ca să ai timp pentru o relație la care ții.",
      "Încearcă să măsori o zi bună și prin cât de prezent te-ai simțit în ea.",
      "Dă-ți voie să faci un plan pe termen lung care chiar te entuziasmează.",
      "Uită-te la ce ți-ai dori să poți oferi mai des, dacă ai avea puțin mai mult timp.",
    ],
    seara: [
      "Dacă luni îți ocupă deja gândurile, scrie primul lucru de făcut și întoarce-te la seara ta.",
      "Ce ți-a oferit săptămâna asta fără să fi trecut undeva în plan?",
      "Lasă o lumină aprinsă și stai câteva minute cu tine, așa cum ai sta cu un prieten.",
      "Dă-ți credit pentru lucrurile pe care numai tu știi cât efort le-au cerut.",
      "Alege o vorbă bună pe care ai vrea s-o iei cu tine în zilele următoare.",
      "Gândește-te unde te-ai simțit mai liber să fii tu în ultimele zile.",
      "Dacă ai descoperit ceva ce îți face bine, păstrează-i un loc în viața ta.",
      "Fă pace cu ritmul în care ai putut să duci săptămâna asta.",
      "Adu-ți aminte de cineva care se bucură că ești în viața lui.",
      "Mâine poți să reiei ce contează. În seara asta, lasă somnul să-și facă treaba.",
    ],
  },
};

export function getMotivationalMessage(): string {
  const now = new Date();
  const hour = now.getHours();
  const dayIndex = now.getDay();

  const dayMap: DayKey[] = [
    "duminica", "luni", "marti", "miercuri", "joi", "vineri", "sambata",
  ];

  // Three moments: morning 5-12, afternoon 12-18, evening from 18 until 5 in the morning
  let period: PeriodKey;
  if (hour >= 5 && hour < 12) period = "dimineata";
  else if (hour >= 12 && hour < 18) period = "dupa-amiaza";
  else period = "seara";

  const day = dayMap[dayIndex];
  const pool = messages[day][period];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const firstName = name.split(" ")[0];

  if (hour >= 5 && hour < 12) return `Bună dimineața, ${firstName}!`;
  if (hour >= 12 && hour < 18) return `Bună ziua, ${firstName}!`;
  if (hour >= 18 && hour < 22) return `Bună seara, ${firstName}!`;
  return `Salut, ${firstName}!`;
}
