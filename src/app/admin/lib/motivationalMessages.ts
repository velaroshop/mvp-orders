export type DayKey = "luni" | "marti" | "miercuri" | "joi" | "vineri" | "sambata" | "duminica";
export type PeriodKey = "dimineata" | "pranz" | "dupa-amiaza" | "seara" | "noapte";

export const messages: Record<DayKey, Record<PeriodKey, string[]>> = {
  luni: {
    dimineata: [
      "Luni dimineață: cafeaua trezește echipa, reclama bună trezește interesul. Hai să pornim ambele.",
      "Săptămână nouă, idei noi. Acel «doar mă uit» încă nu știe ce ofertă îi pregătim.",
      "E luni! Punem produsele în lumină bună și le dăm motive să iasă din depozit.",
      "Prima misiune a săptămânii: o reclamă care oprește degetul, nu doar consumă bugetul.",
      "Deschidem săptămâna cu o întrebare bună: ce-l face pe client să spună «îl vreau»?",
    ],
    pranz: [
      "Luni la prânz: tu alegi meniul, clientul alege produsul. Hai să-i facem alegerea ușoară.",
      "Prima dimineață ne-a dat câteva cifre. După prânz, le cerem și explicații.",
      "Campania de luni e la început. N-o trimitem la pensie înainte de prânz.",
      "Poftă bună! După masă, scriem o ofertă care lasă mai puțin loc de «mă mai gândesc».",
      "La prânzul de luni, optimismul rămâne în meniu. Bugetul se servește cu măsură.",
    ],
    "dupa-amiaza": [
      "Luni după-amiază: primul test n-a convins? Bine că avem imaginație și pentru al doilea.",
      "Hai să dăm săptămânii un început bun: mai puțin text de umplutură, mai mult «asta îmi trebuie».",
      "Produsul bun merită o prezentare pe măsură. După-amiaza asta îi facem intrarea.",
      "Un coș abandonat nu ne strică lunea. Ne dă un motiv să verificăm ce l-a speriat.",
      "Mai e timp azi să transformi o idee din ciornă într-o reclamă demnă de testat.",
    ],
    seara: [
      "Luni seara: ce reclamă a stârnit interesul? De acolo avem fir pentru mâine.",
      "Prima zi se încheie. Reclamele primesc note, nu sentințe pe viață.",
      "Hai să închidem lunea cu comenzile clare. Profitului îi place ordinea din culise.",
      "Seara asta, o idee bună pentru marți valorează mai mult decât zece modificări din nervi.",
      "Luni ne-a dat material de lucru. Mâine montăm varianta cu replici mai bune.",
    ],
    noapte: [
      "Luni noaptea: ideile se notează, bugetele nu se măresc din insomnie.",
      "Săptămâna e lungă. Reclama poate lucra noaptea, tu nu trebuie să-i ții de urât.",
      "Ai găsit un unghi bun la miezul nopții? Salvează-l înainte să se deghizeze în vis.",
      "Prima noapte a săptămânii: campania are program, iar tu ai voie să ai somn.",
      "Luni, la ora asta, pregătim următoarea mișcare. Butonul de publicare rezistă până dimineață.",
    ],
  },

  marti: {
    dimineata: [
      "Marți, trei ceasuri bune: unul pentru idei, unul pentru reclame, unul pentru comenzi.",
      "Cafeaua e gata. Azi aflăm ce merită păstrat din curajul de luni.",
      "Marți dimineață: produsul are calități. Hai să nu le ascundem după o introducere de roman.",
      "Azi punem beneficiul în prima frază. Clientul n-a venit în feed să caute indicii.",
      "E marți! Avem o zi întreagă să facem oferta mai greu de ignorat.",
    ],
    pranz: [
      "Marți la prânz: campaniile au primit buget. Acum primește și echipa ceva bun.",
      "După masă, verificăm cine atrage clienți și cine doar colecționează aplauze.",
      "La meniul de marți: o idee proaspătă și un titlu fără garnitură de clișee.",
      "Ai un produs bun și o ofertă clară? După prânz le facem cunoștință cu publicul.",
      "Pauza de marți: lăsăm reclama să adune date, nu-i suflăm în ceafă la fiecare minut.",
    ],
    "dupa-amiaza": [
      "Marți după-amiază: schimbăm unghiul, nu produsul. Poate încă nu i-am găsit replica bună.",
      "Hai să facem pagina atât de clară încât clientul să întrebe doar «ce culoare aleg?».",
      "Azi scoatem un «oare cum funcționează?» din mintea clientului. Demonstrația intră în scenă.",
      "După-amiaza asta, creativitatea are o misiune comercială. Frumos e bine, convingător e și mai bine.",
      "Marțea merge bine cu teste curajoase și bugete care rămân cu picioarele pe pământ.",
    ],
    seara: [
      "Marți seara: păstrăm ce a convins și învățăm din ce a fost doar decor.",
      "Ai răspuns azi la aceeași întrebare de cinci ori? Uite ideea pentru reclama de mâine.",
      "Seara asta, recenziile au microfonul. Uneori clientul scrie cel mai bun argument.",
      "Încheiem marțea cu un câștig sigur: știm ceva ce ieri doar presupuneam.",
      "Comenzile de azi ne arată cine cumpără. Mâine vorbim mai bine pe limba lor.",
    ],
    noapte: [
      "Marți noaptea: dacă ai deschis Ads Manager din reflex, poți închide tot din reflex.",
      "O idee de reclamă nu trebuie pierdută. Scrie-o, apoi las-o și pe ea să doarmă.",
      "La ora asta, cifrele nu cer companie. Mâine le punem întrebările bune.",
      "Noaptea de marți vine cu un avantaj: nicio ședință între tine și ideea aia bună.",
      "Dacă ești în tură, fiecare comandă clarificată scutește dimineața de un mic episod polițist.",
    ],
  },

  miercuri: {
    dimineata: [
      "Miercuri! Jumătatea săptămânii e un loc bun pentru o reclamă întreagă la minte.",
      "Cafeaua de miercuri vine cu date în plus. Azi ghicim mai puțin și alegem mai bine.",
      "Ai ajuns la mijlocul săptămânii. Oferta ta încă poate ajunge în centrul atenției.",
      "Miercuri dimineață: dacă produsul rezolvă o problemă, hai să nu ținem soluția secretă.",
      "Azi căutăm ideea care face clientul să spună «fix asta pățesc și eu».",
    ],
    pranz: [
      "Mijlocul zilei, mijlocul săptămânii. Moment bun să vedem ce reclame își merită locul la masă.",
      "Miercuri la prânz: hrănim echipa, apoi verificăm ce campanii doar ronțăie buget.",
      "După masă, punem întrebarea gustoasă: din vânzările astea, cât ne rămâne?",
      "La pauza de miercuri, o conversație cu agenții poate valora cât zece titluri inventate în liniște.",
      "Săptămâna e la jumătate. Ideile bune n-au motiv să intre deja la desert.",
    ],
    "dupa-amiaza": [
      "Miercuri după-amiază: un clip simplu cu produsul în acțiune poate bate o prezentare cu papion.",
      "Hai să arătăm rezultatul mai repede. Degetul clientului are alte planuri dacă îl ținem la povești.",
      "La mijlocul săptămânii, mai testăm o intrare. Aceeași ofertă poate avea o prezentare mai bună.",
      "Azi facem loc reclamelor care conving. Cele care doar pozează frumos pot aștepta.",
      "Mai avem jumătate de săptămână să găsim mesajul potrivit. Atelierul de idei rămâne deschis.",
    ],
    seara: [
      "Miercuri seara: jumătate de săptămână trecută, câteva presupuneri scoase la pensie.",
      "Ce reclamă ai trimite unui prieten fără explicații suplimentare? Acolo e un semn bun.",
      "Încheiem miercurea cu cifrele pe masă. Profitul n-are nevoie de filtre.",
      "Ai găsit azi un argument bun? Mâine îl punem în primul rând, la vedere.",
      "Seara de miercuri: și un test nereușit poate livra ceva util. Măcar știm ce nu repetăm.",
    ],
    noapte: [
      "Miercuri noaptea: mintea poate închide filele. Ideile salvate nu fug la concurență.",
      "La jumătatea săptămânii, cel mai bun upgrade poate fi un somn întreg.",
      "Reclama lucrează și fără public în spatele monitorului. Nu trebuie să-i aplauzi fiecare click.",
      "Ai o idee nocturnă pentru produs? Notează beneficiul înainte să-i inventezi coloana sonoră.",
      "Dacă lucrezi în noaptea asta, mergem comandă cu comandă. Nici bestsellerul n-a plecat tot odată.",
    ],
  },

  joi: {
    dimineata: [
      "Joi dimineață: weekendul se apropie. Hai să-l întâmpinăm cu oferte care se înțeleg din prima.",
      "Cafeaua e caldă, planul de weekend prinde formă. Produsele tale au ceva de spus.",
      "Azi pregătim reclamele pentru oamenii care vor avea timp să le vadă. Să merite oprirea.",
      "Joia e bună pentru repetiția generală. Verificăm oferta înainte să ridicăm cortina.",
      "Mai e o zi până vineri. Suficient cât să dai unei idei bune și o execuție pe măsură.",
    ],
    pranz: [
      "Joi la prânz: înainte să vindem în weekend, verificăm că avem și ce pune în colet.",
      "Meniul de azi: ofertă clară, stoc verificat și promisiuni pe care le putem livra.",
      "După prânz, potrivim reclama cu pagina. Clientul n-a cumpărat bilet la vânătoare de comori.",
      "La masa de joi, întrebarea bună e simplă: de ce ar alege clientul produsul nostru?",
      "Pauza de azi poate naște ideea de mâine. Ține șervețelul aproape, uneori ține loc de brief.",
    ],
    "dupa-amiaza": [
      "Joi după-amiază: verificăm traseul până la plată. Reclama a muncit prea mult ca să pierdem clientul pe drum.",
      "Un preț clar și o livrare explicată pot face mai mult decât încă trei semne de exclamare.",
      "Pregătim weekendul cu cap. «Merge și așa» nu intră în echipa de vânzări.",
      "Azi îi dăm clientului răspunsurile înainte să caute butonul de închidere.",
      "Ultimele retușuri de joi: mai puțină confuzie în ofertă, mai mult loc pentru «adaugă în coș».",
    ],
    seara: [
      "Joi seara: reclama e pregătită, pagina e clară. Acum chiar avem ce trimite în lume.",
      "Mâine e vineri. Lasă campaniile pregătite, ca dimineața să înceapă cu cafea, nu cu detectivistică.",
      "Încheiem joia cu promisiuni bune și stoc pe măsură. Depozitul aprobă mesajul.",
      "Seara asta, o verificare atentă ne poate scuti de comedia greșelilor de mâine.",
      "Ai pregătit oferta de weekend? Frumos, acum are și vineri motiv să vină.",
    ],
    noapte: [
      "Joi noaptea: campaniile sunt pregătite de weekend. Tu te poți pregăti de pernă.",
      "Dacă ideea pare genială la miezul nopții, salveaz-o. Mâine o invităm și la proba de logică.",
      "Noaptea asta, un link verificat bate un slogan lustruit pentru a douăzecea oară.",
      "Oferta e programată? Las-o să-și aștepte intrarea fără să stai de pază la cortină.",
      "Ai pus totul la punct pentru vineri. Poți ieși din Ads Manager cu fruntea sus și pleoapele jos.",
    ],
  },

  vineri: {
    dimineata: [
      "E vineri! Cafeaua miroase a weekend, iar oferta trebuie să miroasă a alegere bună.",
      "Azi facem reclamele să merite o pauză de la filmulețele cu pisici. Concurența e serioasă.",
      "Vineri dimineață: produsele sunt gata de plecare. Hai să le găsim cumpărători potriviți.",
      "Avem o zi bună pentru un «îl iau». Să-i dăm clientului și motivul.",
      "Începem vinerea cu chef de vânzări și cu calculatorul aproape. Entuziasmul trebuie să lase și marjă.",
    ],
    pranz: [
      "Vineri la prânz: tu te gândești la weekend, clientul poate se gândește la produs. Ajută-l cu o ofertă clară.",
      "Poftă bună! După masă, vedem dacă reclamele au adus doar vizitatori sau și musafiri la casă.",
      "La meniul de vineri: vânzări bune, costuri înțelese și profit fără surprize în nota de plată.",
      "Mai e jumătate de zi. O idee bună încă poate prinde trenul de weekend.",
      "Pauză de prânz! Reclama poate continua conversația cu clientul cât tu o continui cu colegii.",
    ],
    "dupa-amiaza": [
      "Vineri după-amiază: păstrăm ce vinde și nu dublăm bugetul doar fiindcă suntem bine dispuși.",
      "Hai să trimitem comenzile spre clienți, nu întrebările spre colegul de weekend.",
      "Ultimele ore de vineri: punem claritate în statusuri și liniște în telefoane.",
      "Weekendul bate la ușă. Să-l întâmpinăm cu campanii pregătite, nu cu «vedem noi».",
      "O predare bună azi ține vânzările în mișcare. Colegul de mâine merită toate indiciile.",
    ],
    seara: [
      "Vineri seara: lumea deschide telefonul. Hai să avem ceva mai convingător decât «super ofertă».",
      "Închidem ziua cu cap: ce vinde rămâne, ce consumă fără rost intră la întrebări.",
      "Săptămâna merită un bilanț bun. Aplauze pentru comenzi, atenție și la cât rămâne.",
      "Ai încheiat tura? Reclamele pot rămâne la program, tu poți schimba decorul.",
      "Vineri seara, cea mai frumoasă notificare poate fi și de la curierul cu pizza ta.",
    ],
    noapte: [
      "Tu ai nevoie de somn, reclama bună de setări bune. Fiecare cu meseria lui.",
      "Vineri noaptea: ideile de campanie se salvează înainte să fie povestite tuturor la masă.",
      "Dacă ești în tură, tu ții magazinul în mișcare. Cafeaua nu poate trece asta în CV.",
      "Ai intrat doar să verifici vânzările? Frumos, dar weekendul nu e o anexă la raport.",
      "La ora asta, lăsăm bugetul în limitele stabilite. Entuziasmul de vineri nu primește acces de administrator.",
    ],
  },

  sambata: {
    dimineata: [
      "Sâmbătă dimineață: clientul are cafeaua într-o mână și telefonul în cealaltă. Să merite ce vede.",
      "Magazinul e deschis, ideile sunt proaspete. Hai să facem produsul vedeta dimineții.",
      "E sâmbătă! Oferta bună se înțelege și înainte de a doua cafea.",
      "Pentru echipa de weekend: voi transformați «mă uit puțin» în colete cu destinație.",
      "Azi vindem pe limba oamenilor. Nici sâmbăta nu cere nimeni specificații citite ca la examen.",
    ],
    pranz: [
      "Sâmbătă la prânz: ofertele pot fi savuroase, dar nu țin loc de mâncare. Ia o pauză.",
      "Clientul întreabă dacă produsul i se potrivește? Un răspuns bun valorează mai mult decât trei «cumpără acum».",
      "După prânz, arătăm produsul în viața reală. Și el merită să iasă din fundalul alb.",
      "La meniul de weekend: conversații omenești și recomandări care chiar au sens.",
      "Sâmbăta asta, facem alegerea mai simplă. Clientul are planuri și după cumpărături.",
    ],
    "dupa-amiaza": [
      "Sâmbătă după-amiază: un demo bun arată ce zece adjective doar promit.",
      "Hai să facem o reclamă pe care ai urmări-o și dacă n-ar fi a noastră.",
      "Produsul rezolvă o bătaie de cap? Azi îi arătăm clientului exact cum scapă de ea.",
      "În după-amiaza asta, un răspuns rapid poate salva un coș de la viața în singurătate.",
      "Weekendul e bun pentru povești. A produsului nostru să aibă și un motiv de cumpărare.",
    ],
    seara: [
      "Sâmbătă seara: reclama intră printre poze de vacanță. Dă-i un motiv bun să nu fie sărită.",
      "Clientul n-a venit în feed pentru noi. Cu atât mai frumos dacă reușim să-i fim utili.",
      "Încheiem tura cu comenzile puse la punct. Coletele nu apreciază suspansul.",
      "Seara asta, oferta poate fi scurtă și convingătoare. Nu-i trebuie discurs de nuntă.",
      "Ai ajutat azi un client să aleagă bine? Asta merită trecut lângă cifrele de vânzări.",
    ],
    noapte: [
      "Sâmbătă noaptea: magazinul are program lung, dar tu nu ești extensie de browser.",
      "Un client nocturn merită aceeași pagină clară. La ora asta, nimeni nu vrea rebus la checkout.",
      "Dacă tura continuă, luăm comenzile pe rând. Precizia încă bate viteza cu ochii închiși.",
      "Ideea de reclamă venită acum poate aștepta dimineața. Nu se supără și nici nu cere dobândă.",
      "Ai verificat ce era necesar? Închide liniștit, campania nu are nevoie de cântec de leagăn.",
    ],
  },

  duminica: {
    dimineata: [
      "Duminică dimineață: cafea în tihnă și reclame care ajung la subiect. O combinație civilizată.",
      "Azi putem vinde fără să strigăm. Un beneficiu clar se aude și duminica.",
      "Produsul tău face viața mai ușoară? Arată-i clientului cum arată acea duminică.",
      "Bună dimineața! O ofertă bună n-are nevoie de șapte semne de exclamare ca să fie observată.",
      "E duminică. Hai să fim recomandarea utilă din feed, nu musafirul care vorbește peste toți.",
    ],
    pranz: [
      "Duminică la prânz: masa e pentru oameni, raportul poate aștepta să terminăm conversația.",
      "După prânz, alegem ideile pentru luni. Cele bune trec și fără costum de prezentare.",
      "Ce au întrebat clienții săptămâna asta? Avem deja ingrediente pentru reclame noi.",
      "La meniul de duminică: puțină analiză și zero bugete crescute doar din plictiseală.",
      "Săptămâna ne-a dat cifre. După masă, scoatem din ele ceva mai util decât un «interesant».",
    ],
    "dupa-amiaza": [
      "Duminică după-amiază: alegem o idee bună pentru luni. Nu trebuie să inventăm tot internetul azi.",
      "Pregătim săptămâna cu reclame clare și stoc real. Magia rămâne în execuție.",
      "Ce a mers bine merită continuat. Nu schimbăm actorul principal doar fiindcă începe un episod nou.",
      "Azi punem întrebările bune pentru mâine. Profitul preferă planurile în locul ghicitului.",
      "Un brief scurt acum poate salva o ședință lungă luni. Iată o ofertă greu de refuzat.",
    ],
    seara: [
      "Duminică seara: ideile sunt notate, campaniile au un plan. Luni nu mai intră pe nepregătite.",
      "Săptămâna viitoare începe cu ce am învățat. Măcar greșelile să vină cu experiență inclusă.",
      "Ai pregătit prima reclamă de luni? Perfect, dimineața va cere doar cafea și atenție.",
      "Încheiem săptămâna cu o întrebare bună: ce putem face mai ușor de cumpărat?",
      "Planul e gata. Acum poți lăsa pâlnia de vânzări și poți alege o cană de ceai.",
    ],
    noapte: [
      "Duminică noaptea: cel mai bun impuls pentru ideile de luni poate fi opt ore fără Ads Manager.",
      "Săptămâna nouă are loc pentru teste. Nu trebuie să le înghesuim între miezul nopții și pernă.",
      "Ai salvat ideea aceea bună? Mâine vedem dacă știe să vândă la fel de bine cum sună.",
      "Dacă ești în tură, o comandă lămurită acum îi scutește pe colegi de cafea băută cu întrebări.",
      "Luni vine oricum. Tu poți veni cu mintea limpede și cu un titlu mai bun decât «OFERTĂ WOW».",
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

export function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const firstName = name.split(" ")[0];

  if (hour >= 5 && hour < 12) return `Bună dimineața, ${firstName}!`;
  if (hour >= 12 && hour < 18) return `Bună ziua, ${firstName}!`;
  if (hour >= 18 && hour < 22) return `Bună seara, ${firstName}!`;
  return `Salut, ${firstName}!`;
}
