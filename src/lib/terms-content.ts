/**
 * Termeni și condiții EMS — conținut canonic, definit server-side.
 *
 * IMPORTANT: Înainte de publicarea comercială:
 *   1. Completează toate câmpurile marcate cu [PLACEHOLDER].
 *   2. Revizuiește textul împreună cu un jurist.
 *   3. Actualizează TERMS_VERSION, TERMS_EFFECTIVE_DATE și TERMS_IDENTIFIER.
 *   4. Recalculează TERMS_CONTENT_HASH prin re-rularea build-ului.
 *
 * Decizii de completat marcate în text cu: ⚠️ DE STABILIT
 */

import { createHash } from "crypto";

// ─── Versiune și identificator ──────────────────────────────────────────────

export const TERMS_VERSION = "v1.0";
export const TERMS_EFFECTIVE_DATE = "7 octombrie 2026";
export const TERMS_IDENTIFIER = "TC-EMS-v1.0-draft-20261007";
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
      de îndată la <strong>[EMAIL CONTACT]</strong>.</p>
    `,
  },
  {
    id: "5",
    title: "5. Abonamentul și prețul",
    content: `
      <p>Costul abonamentului este de <strong>550 lei/lună</strong>, sumă fixă, fără TVA,
      atât timp cât Furnizorul aplică regimul de scutire de TVA.</p>
      <p>⚠️ <em>DE STABILIT: Momentul de la care abonamentul plătit devine activ
      (inclusiv dacă există o perioadă de probă gratuită sau un cont gratuit cu funcționalități
      limitate). Această decizie trebuie consemnată în termeni înainte de lansarea comercială.</em></p>
      <p>⚠️ <em>DE STABILIT: Tratamentul prețului în cazul în care Furnizorul devine plătitor
      de TVA ulterior.</em></p>
      <p>Modificările de preț sunt supuse prevederilor Secțiunii 13.</p>
    `,
  },
  {
    id: "6",
    title: "6. Facturarea și plata",
    content: `
      <p>Facturarea se efectuează la sfârșitul fiecărei luni calendaristice, pentru luna
      respectivă (facturare în avans postum).</p>
      <p>⚠️ <em>DE STABILIT: Termenul de plată al facturii (ex: 15 zile de la emitere).</em></p>
      <p>⚠️ <em>DE STABILIT: Modalitatea de facturare pentru prima lună, dacă înregistrarea
      are loc în cursul lunii (lună întreagă sau proporțional cu zilele rămase).</em></p>
      <p>⚠️ <em>DE STABILIT: Procedura de notificare și termenul de suspendare a accesului
      în cazul neplății.</em></p>
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
      <strong>[EMAIL CONTACT]</strong> sau prin mecanismul de anulare disponibil în cont
      (dacă există).</p>
      <p>⚠️ <em>DE STABILIT: Momentul în care anularea produce efecte (ex: la sfârșitul
      perioadei de facturare curente sau imediat).</em></p>
      <p>⚠️ <em>DE STABILIT: Dacă există o perioadă minimă obligatorie de abonament.</em></p>
      <p>⚠️ <em>DE STABILIT: Condițiile de export, păstrare și ștergere a datelor Clientului
      după încetarea abonamentului (ex: perioadă de grație de 30 de zile pentru export).</em></p>
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
      <p>Suportul tehnic este disponibil la <strong>[EMAIL CONTACT]</strong>.
      ⚠️ <em>DE STABILIT: Orele de asistență și timpii de răspuns așteptați.</em></p>
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
      cu notificarea prealabilă a Clientului.</p>
      <p>⚠️ <em>DE STABILIT: Termenul de preaviz pentru modificări (ex: 30 de zile
      înainte de intrarea în vigoare).</em></p>
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
        <li>Email: <strong>[EMAIL CONTACT]</strong></li>
        <li>Adresă poștală: <strong>[SEDIU]</strong></li>
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
