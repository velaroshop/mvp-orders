/**
 * Termeni și condiții EMS — conținut canonic, definit server-side.
 * Versiunea și hash-ul sunt calculate automat la build.
 */

import { createHash } from "crypto";

// ─── Versiune și identificator ──────────────────────────────────────────────

export const TERMS_VERSION = "v1.1";
export const TERMS_EFFECTIVE_DATE = "9 octombrie 2026";
export const TERMS_IDENTIFIER = "TC-EMS-v1.1-20261009";
export const PLATFORM_NAME = "EMS (Ecom Made Simple)";

// ─── Secțiunile termenilor ───────────────────────────────────────────────────

export interface TermsSection {
  id: string;
  title: string;
  content: string; // HTML simplu: <p>, <ul>, <li>, <strong>
}

export const TERMS_SECTIONS: TermsSection[] = [
  {
    id: "1",
    title: "1. Identificarea furnizorului",
    content: `
      <p><strong>JUPIMEDIA SRL</strong>, societate comercială înregistrată în România,
      CUI <strong>25011510</strong>, nr. Registrul Comerțului <strong>J38/70/2009</strong>,
      cu sediul la <strong>Str. Principală nr. 26, Păușești-Măglași, Vâlcea</strong>, denumită în continuare <strong>„Furnizorul"</strong>.</p>
      <p>Date de contact: <strong>contact@jupimedia.ro</strong>.</p>
      <p>Furnizorul aplică regimul de scutire de TVA prevăzut la art. 292 din Codul fiscal.
      Facturile emise nu conțin TVA.</p>
    `,
  },
  {
    id: "2",
    title: "2. Aplicabilitate — exclusiv persoane juridice",
    content: `
      <p>Platforma <strong>${PLATFORM_NAME}</strong> și prezentul contract de abonament sunt
      destinate exclusiv persoanelor juridice sau altor entități cu personalitate juridică
      (societăți comerciale, PFA-uri, întreprinderi individuale, asociații etc.),
      denumite în continuare <strong>„Clientul"</strong>.</p>
      <p>Prin acceptarea prezentelor Termeni și Condiții, persoana fizică care efectuează
      înregistrarea confirmă că:</p>
      <ul>
        <li>acționează în numele și pe seama Clientului (persoana juridică);</li>
        <li>este autorizată să angajeze juridic Clientul;</li>
        <li>datele firmei completate în formularul de înregistrare sunt corecte și complete.</li>
      </ul>
      <p>Dacă nu ești autorizat să reprezinți firma, nu continua înregistrarea.</p>
    `,
  },
  {
    id: "3",
    title: "3. Descrierea serviciului",
    content: `
      <p><strong>${PLATFORM_NAME}</strong> este o platformă software furnizată ca serviciu (SaaS)
      destinată gestionării comenzilor pentru afaceri de e-commerce. Serviciul include
      accesul la interfața web a platformei, funcționalitățile disponibile la momentul
      abonării și actualizările incluse în planul de abonament.</p>
      <p>Furnizorul poate adăuga, modifica sau retrage funcționalități, cu condiția de a nu
      reduce substanțial nivelul serviciului față de cel existent la momentul contractării,
      fără notificare prealabilă conform Secțiunii 13.</p>
      <p>Accesul la platformă este acordat pe durata abonamentului activ. La încetarea
      abonamentului, accesul este suspendat conform Secțiunii 7.</p>
    `,
  },
  {
    id: "4",
    title: "4. Crearea contului și securitatea accesului",
    content: `
      <p>La înregistrare, Clientul trebuie să furnizeze date corecte, complete și actuale
      despre firma sa. Clientul este responsabil pentru actualizarea datelor în cazul
      modificărilor ulterioare.</p>
      <p>Credențialele de acces (email și parolă) sunt confidențiale. Clientul răspunde
      pentru toate acțiunile efectuate prin contul său. Furnizorul recomandă utilizarea
      de parole puternice și unice.</p>
      <p>În cazul suspiciunii de acces neautorizat, Clientul va notifica Furnizorul
      de îndată la <strong>contact@jupimedia.ro</strong>.</p>
    `,
  },
  {
    id: "5",
    title: "5. Planurile de abonament și prețul",
    content: `
      <p>Platforma este disponibilă în două planuri de abonament, cu prețuri fixe, fără TVA,
      atât timp cât Furnizorul aplică regimul de scutire de TVA prevăzut la art. 292 din Codul fiscal:</p>

      <p><strong>Planul PRO — 650 lei/lună</strong></p>
      <ul>
        <li>Până la <strong>5 magazine</strong> active;</li>
        <li>Până la <strong>15 produse</strong> și <strong>15 landing pages</strong>;</li>
        <li>Upsells pre-sale și post-sale;</li>
        <li>Integrare Helpship WMS (configurare manuală);</li>
        <li>Meta Pixel și Meta Conversions API (tracking server-side);</li>
        <li>Echipă: până la <strong>5 utilizatori</strong>;</li>
        <li>Calculator ROAS cu import manual CSV;</li>
        <li>Suport standard prin email (timp de răspuns: 24 ore lucrătoare).</li>
      </ul>

      <p><strong>Planul ULTRA — 1.000 lei/lună</strong></p>
      <ul>
        <li>Magazine <strong>nelimitate</strong>;</li>
        <li>Produse și landing pages <strong>nelimitate</strong>;</li>
        <li>Upsells pre-sale și post-sale;</li>
        <li>Integrare Helpship WMS <strong>asistată</strong> (configurare realizată de Furnizor);</li>
        <li>Meta Pixel și Meta Conversions API (tracking server-side);</li>
        <li>Echipă: utilizatori <strong>nelimitați</strong>;</li>
        <li>Import automat date Meta Ads (fără upload manual CSV);</li>
        <li>Dashboard campanii publicitare (ROAS per campanie și per set de anunțuri);</li>
        <li>Export date comenzi și clienți (format CSV/Excel);</li>
        <li>Acces API pentru integrări custom;</li>
        <li>Suport prioritar cu SLA <strong>24 de ore</strong> (inclusiv zile nelucrătoare);</li>
        <li>Onboarding dedicat — sesiune de setup asistat cu echipa Furnizorului.</li>
      </ul>

      <p>Abonamentul devine activ după activarea contului de către administratorul platformei.
      Furnizorul va activa contul în cel mai scurt timp rezonabil de la înregistrare.</p>
      <p>Planul activ al Clientului este cel menționat în confirmarea de activare a contului
      și pe facturile emise. Trecerea de la un plan la altul se face prin notificarea
      Furnizorului și produce efecte de la următorul ciclu de facturare.</p>
      <p>În cazul în care Furnizorul devine plătitor de TVA ulterior, prețul abonamentului
      devine <strong>prețul planului activ + TVA</strong>, Clientul urmând a plăti suma rezultată
      conform cotei de TVA în vigoare la acel moment. Modificarea este supusă notificării
      prealabile conform Secțiunii 13.</p>
      <p>Modificările de preț sunt supuse prevederilor Secțiunii 13.</p>
    `,
  },
  {
    id: "6",
    title: "6. Facturarea și plata",
    content: `
      <p>Ciclul de facturare este lunar și corespunde datei de înregistrare a Clientului.
      Factura se emite în ziua imediat anterioară datei de înregistrare din luna următoare
      (exemplu: înregistrare pe data de 10 → factură emisă pe data de 9 a lunii următoare,
      pentru perioada 10–9).</p>
      <p>Termenul de plată este de <strong>15 zile calendaristice</strong> de la data emiterii facturii.</p>
      <p>În cazul neachitării facturii în termenul de plată, Furnizorul va suspenda accesul
      la platformă în ziua imediat următoare expirării termenului de plată, fără altă notificare
      prealabilă. Reactivarea accesului se face după achitarea integrală a sumelor restante.</p>
      <p>Plata se efectuează prin mijloacele indicate pe factură. Clientul este responsabil
      pentru furnizarea datelor de facturare corecte (inclusiv CUI pentru deductibilitate).</p>
    `,
  },
  {
    id: "7",
    title: "7. Durata, reînnoirea și anularea abonamentului",
    content: `
      <p>Abonamentul se reînnoiește automat lunar, dacă nu este anulat în prealabil.</p>
      <p>Clientul poate anula abonamentul oricând, prin notificarea Furnizorului la
      <strong>contact@jupimedia.ro</strong> sau prin mecanismul de anulare disponibil în cont
      (dacă există).</p>
      <p>Anularea produce efecte la sfârșitul perioadei de facturare curente. Clientul
      păstrează accesul la platformă până la ultima zi a perioadei pentru care a plătit.</p>
      <p>Nu există perioadă minimă obligatorie de abonament. Clientul poate anula oricând,
      fără costuri suplimentare de reziliere.</p>
      <p>După încetarea abonamentului, datele Clientului rămân disponibile pentru export
      timp de <strong>30 de zile calendaristice</strong>. La expirarea acestui termen,
      datele vor fi șterse definitiv. Furnizorul nu răspunde pentru datele neexportate
      în termenul indicat.</p>
      <p>La încetarea abonamentului, accesul la platformă este suspendat. Obligațiile
      financiare scadente anterior încetării rămân exigibile.</p>
    `,
  },
  {
    id: "8",
    title: "8. Utilizarea permisă și interzisă",
    content: `
      <p>Clientul poate utiliza platforma exclusiv în scopuri legale și pentru activitățile
      proprii de e-commerce. Este interzis:</p>
      <ul>
        <li>utilizarea platformei pentru activități ilegale sau frauduloase;</li>
        <li>accesul neautorizat la conturile altor utilizatori sau la infrastructura Furnizorului;</li>
        <li>colectarea automatizată de date (scraping) fără acordul prealabil al Furnizorului;</li>
        <li>distribuirea, revânzarea sau sublicențierea accesului la platformă;</li>
        <li>orice acțiune care perturbă funcționarea normală a platformei sau afectează
        alți utilizatori;</li>
        <li>încărcarea de conținut care încalcă drepturi ale terților sau legislația aplicabilă.</li>
      </ul>
      <p>Încălcarea acestor prevederi poate conduce la suspendarea sau rezilierea imediată
      a accesului, fără restituirea abonamentului plătit pentru perioada curentă.</p>
    `,
  },
  {
    id: "9",
    title: "9. Disponibilitate, mentenanță și suport",
    content: `
      <p>Furnizorul depune eforturi rezonabile pentru menținerea disponibilității platformei,
      fără a garanta o disponibilitate minimă sau timpi de răspuns specifici.</p>
      <p>Furnizorul poate efectua lucrări de mentenanță programată sau neprogramată, care
      pot afecta temporar accesul. Furnizorul va notifica Clientul cu privire la
      mentenanța programată în avans, în măsura posibilului.</p>
      <p>Suportul tehnic este disponibil la <strong>contact@jupimedia.ro</strong>,
      în intervalul <strong>Luni–Vineri, 09:00–18:00</strong>.</p>
      <p>Timpul de răspuns variază în funcție de planul activ: Clienții cu <strong>Plan PRO</strong>
      beneficiază de răspuns în termen de <strong>24 de ore lucrătoare</strong>; Clienții cu
      <strong>Plan ULTRA</strong> beneficiază de suport prioritar cu SLA de <strong>24 de ore</strong>,
      inclusiv în zilele nelucrătoare.</p>
    `,
  },
  {
    id: "10",
    title: "10. Proprietatea intelectuală",
    content: `
      <p>Platforma <strong>${PLATFORM_NAME}</strong>, inclusiv codul sursă, design-ul,
      documentația și toate elementele sale componente, aparțin Furnizorului și sunt
      protejate de legislația privind drepturile de autor și proprietatea intelectuală.</p>
      <p>Abonamentul acordă Clientului un drept de utilizare limitat, neexclusiv și
      netransferabil al platformei, pe durata abonamentului.</p>
      <p>Datele, conținuturile și materialele încărcate de Client în platformă
      aparțin Clientului. Furnizorul nu revendică drepturi de proprietate asupra
      acestora și le utilizează exclusiv pentru furnizarea serviciului.</p>
    `,
  },
  {
    id: "11",
    title: "11. Confidențialitate și protecția datelor cu caracter personal",
    content: `
      <p>Furnizorul prelucrează date cu caracter personal în conformitate cu
      Regulamentul (UE) 2016/679 (GDPR) și legislația națională aplicabilă.</p>
      <p>Acceptarea prezentelor Termeni și Condiții nu reprezintă un consimțământ general
      pentru orice prelucrare de date. Temeiurile de prelucrare aplicabile (executarea
      contractului, obligații legale, interese legitime) sunt detaliate în
      Politica de Confidențialitate a Furnizorului.</p>
      <p>În măsura în care Furnizorul prelucrează date cu caracter personal aparținând
      clienților finali ai Clientului în calitate de împuternicit, relația dintre părți
      va fi reglementată printr-un acord de prelucrare a datelor (DPA) separat,
      conform art. 28 GDPR.</p>
      <p>Prezentul contract nu înlocuiește un acord de prelucrare a datelor.</p>
    `,
  },
  {
    id: "12",
    title: "12. Limitarea răspunderii",
    content: `
      <p>Furnizorul nu răspunde pentru pierderi indirecte, pierderi de profit, pierderi
      de date sau daune consecvente, cu excepția cazurilor de fraudă sau neglijență gravă
      din partea sa.</p>
      <p>Răspunderea totală a Furnizorului față de Client, indiferent de temeiul juridic
      invocat, nu va depăși valoarea abonamentului plătit în ultimele 3 luni anterioare
      evenimentului cauzator de prejudiciu.</p>
      <p>Furnizorul nu garantează că platforma va fi complet lipsită de erori sau că
      va satisface toate cerințele specifice ale Clientului.</p>
    `,
  },
  {
    id: "13",
    title: "13. Modificarea termenilor și a prețului",
    content: `
      <p>Furnizorul poate modifica prezentele Termeni și Condiții sau prețul abonamentului
      cu notificarea prealabilă a Clientului cu cel puțin <strong>15 zile calendaristice</strong>
      înainte de data intrării în vigoare a modificărilor.</p>
      <p>Notificarea se va transmite la adresa de email asociată contului. Dacă Clientul
      nu este de acord cu modificările, are dreptul de a rezilia abonamentul înainte
      de data intrării în vigoare a acestora, fără costuri suplimentare.</p>
      <p>Continuarea utilizării platformei după data intrării în vigoare a modificărilor
      constituie acceptarea acestora.</p>
    `,
  },
  {
    id: "14",
    title: "14. Legea aplicabilă și soluționarea litigiilor",
    content: `
      <p>Prezentul contract este guvernat de legea română.</p>
      <p>Orice litigiu născut din sau în legătură cu prezentul contract va fi soluționat
      în primul rând pe cale amiabilă. Dacă soluționarea amiabilă nu este posibilă,
      competența aparține instanțelor judecătorești române de drept comun, potrivit
      normelor legale în vigoare.</p>
    `,
  },
  {
    id: "15",
    title: "15. Date de contact",
    content: `
      <p>Pentru orice întrebări, notificări sau reclamații referitoare la prezentele
      Termeni și Condiții sau la serviciul furnizat, Clientul poate contacta Furnizorul
      la:</p>
      <ul>
        <li>Email: <strong>contact@jupimedia.ro</strong></li>
        <li>Adresă poștală: <strong>Str. Principală nr. 26, Păușești-Măglași, Vâlcea</strong></li>
      </ul>
      <p>Notificările cu efecte juridice (ex: anularea abonamentului, contestații)
      se transmit în scris, la datele de mai sus.</p>
    `,
  },
];

// ─── Textul complet (pentru hash) ───────────────────────────────────────────

export const TERMS_FULL_TEXT: string =
  `${TERMS_IDENTIFIER}\n` +
  TERMS_SECTIONS.map((s) => `${s.title}\n${s.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}`).join("\n\n");

export const TERMS_CONTENT_HASH: string = createHash("sha256")
  .update(TERMS_FULL_TEXT, "utf8")
  .digest("hex");
