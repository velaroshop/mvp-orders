# Prompt: Generează 175 mesaje motivaționale pentru aplicație SaaS

## Context

Creezi mesaje motivaționale scurte pentru bara de navigare a unei aplicații de management al comenzilor folosite de echipe de e-commerce din România. Mesajele apar în topbar-ul aplicației, sub numele utilizatorului și rolul acestuia.

Utilizatorii sunt operatori și manageri de e-commerce care lucrează zilnic cu comenzi, campanii Meta Ads și echipe de agenți. Sunt oameni serioși, dar care apreciază un ton uman și cald.

---

## Structura necesară

Generează exact **175 mesaje**, organizate astfel:
- **7 zile ale săptămânii**: Luni, Marți, Miercuri, Joi, Vineri, Sâmbătă, Duminică
- **5 intervale orare** per zi:
  - `dimineata` → 05:00–11:59
  - `pranz` → 12:00–13:59
  - `dupa-amiaza` → 14:00–17:59
  - `seara` → 18:00–21:59
  - `noapte` → 22:00–04:59
- **5 mesaje** per zi per interval orar

Total: 7 × 5 × 5 = **175 mesaje**

---

## Ton și stil

- **Optimist, amuzant, energic** — face utilizatorul să zâmbească
- **Scurt** — maxim 1–2 propoziții scurte, ideale pentru o singură linie de text
- **Dă încredere** — utilizatorul simte că ziua va fi bună și că el este capabil
- **Nu e corporatist** — evită clișeele de tip „be the best version of yourself"
- **Uman și direct** — ca și cum un prieten entuziast îți trimite un mesaj dimineața
- **Contextual** — fiecare interval orar și fiecare zi trebuie să simtă relevant (luni diferă de vineri, dimineața diferă de noapte)
- **Limba română** — gramatică corectă, diacritice corecte (ă, â, î, ș, ț), fără dezacorduri

### Exemple de ton corect

- *"Cafeaua e caldă, agenda e liberă. Azi scriem ceva frumos pe ea."* ✅
- *"E vineri! Cea mai bună dimineață din săptămână. Hai să o facem să conteze."* ✅
- *"Jumătate de zi bifată. Și totuși, ce bine se simte."* ✅
- *"Noaptea e lungă și tu ești mai rezistent. Continuă."* ✅

### Exemple de ton greșit

- *"Fii cea mai bună versiune a ta."* ❌ (corporatist, clișeu)
- *"Succesul te așteaptă!"* ❌ (vag, fără personalitate)
- *"Astăzi este o zi minunată."* ❌ (plat, fără energie)

---

## Reguli gramaticale importante

1. **Acordul de gen** — substantivele feminine cer adjective/articole feminine:
   - ✅ „cea mai bună săptămână a ta" (săptămână = feminin)
   - ❌ „cel mai bun săptămână al tău"

2. **Diacritice obligatorii**: ș (nu s), ț (nu t), ă, â, î — verifică fiecare cuvânt

3. **Virgula înainte de „dar", „și" în propoziții coordonate** când e necesar

4. **Nu amesteca registrele** — fie familiar, fie formal, nu ambele în același mesaj

---

## Format de output

Răspunde cu un obiect JSON valid, structurat exact așa:

```json
{
  "luni": {
    "dimineata": ["mesaj1", "mesaj2", "mesaj3", "mesaj4", "mesaj5"],
    "pranz": ["mesaj1", ...],
    "dupa-amiaza": ["mesaj1", ...],
    "seara": ["mesaj1", ...],
    "noapte": ["mesaj1", ...]
  },
  "marti": { ... },
  "miercuri": { ... },
  "joi": { ... },
  "vineri": { ... },
  "sambata": { ... },
  "duminica": { ... }
}
```

**Important:** Răspunde DOAR cu JSON-ul, fără explicații, fără markdown în afara blocului de cod.

---

## Verificare finală

Înainte de a trimite răspunsul, parcurge fiecare mesaj și verifică:
- [ ] Gramatică și diacritice corecte
- [ ] Lungime potrivită (max 2 propoziții scurte)
- [ ] Tonul corespunde intervalului orar și zilei
- [ ] Nu există mesaje duplicate sau foarte similare
- [ ] Niciun clișeu corporatist
