# Propunere Schema de Culori pentru Formular Widget

## Culori existente în Store:
- **primary_color** (default: #FF6B00 - portocaliu)
- **accent_color** (default: #00A854 - verde)
- **background_color** (default: #2C3E50 - gri închis)

## Elemente care pot fi personalizate în formular:

### 1. **Header Preț (zona de sus cu fundal negru)**
- **Fundal header**: `background_color` (în loc de `bg-black`)
- **Text produs**: text alb (poate rămâne alb sau să folosim o culoare contrastantă)
- **Text preț**: text alb (poate rămâne alb)
- **Text preț întreg tăiat**: gri deschis (poate rămâne sau să folosim o variantă mai deschisă a `background_color`)

### 2. **Badge Reducere**
- **Fundal**: `accent_color` (în loc de `bg-emerald-600`)
- **Text**: alb (poate rămâne alb pentru contrast)

### 3. **Iconițe Features (Livrare, Plată)**
- **Culoare iconițe**: `accent_color` (în loc de `text-emerald-400`)
- **Text features**: gri deschis pe fundal închis (poate rămâne sau să folosim o variantă mai deschisă)

### 4. **Carduri Form (fundal alb)**
- **Fundal carduri**: alb (poate rămâne sau să folosim o culoare deschisă)
- **Titluri secțiuni**: text închis (poate rămâne sau să folosim `background_color`)

### 5. **Input Fields**
- **Border normal**: gri (poate rămâne)
- **Border focus**: `primary_color` sau `accent_color` (în loc de `ring-emerald-500`)
- **Text input**: închis (poate rămâne)

### 6. **Butoane Oferte (Cantitate)**
- **Border selected**: `accent_color` (în loc de `border-emerald-500`)
- **Fundal selected**: variantă deschisă a `accent_color` (în loc de `bg-emerald-50`)
- **Text preț**: `accent_color` (în loc de `text-emerald-600`)
- **Text "Selectat"**: `accent_color` (în loc de `text-emerald-600`)
- **Badge-uri headings**: pot folosi `background_color` cu variante (în loc de zinc-700, zinc-800, black)

### 7. **Rezumat Comandă (fundal negru)**
- **Fundal**: `background_color` (în loc de `bg-black`)
- **Text titlu**: alb (poate rămâne)
- **Text itemi**: gri deschis (poate rămâne sau variantă deschisă a `background_color`)
- **Border separator**: variantă mai deschisă a `background_color` (în loc de `border-zinc-700`)
- **Preț total**: `accent_color` sau variantă deschisă (în loc de `text-emerald-400`)

### 8. **Buton Submit "Plasează comanda"**
- **Fundal**: `accent_color` (în loc de `bg-emerald-600`)
- **Hover**: variantă mai închisă a `accent_color` (în loc de `hover:bg-emerald-700`)
- **Animație pulse**: folosește `accent_color` în animație (în loc de emerald)

### 9. **Background General**
- **Gradient background**: poate folosi variante deschise ale `background_color` sau poate rămâne zinc-50/zinc-100

### 10. **Mesaje Eroare**
- **Fundal**: roșu deschis (poate rămâne sau să folosim o culoare de eroare personalizată)
- **Text**: roșu închis (poate rămâne)

### 11. **Mesaje Succes**
- **Fundal**: variantă deschisă a `accent_color` (în loc de `bg-emerald-100`)
- **Iconiță**: `accent_color` (în loc de `text-emerald-600`)

## Propunere Schema Finală:

### Varianta 1: Minim (3 culori existente)
Folosim doar cele 3 culori existente:
- `primary_color` - pentru accent-uri (focus, border-uri)
- `accent_color` - pentru butoane, badge-uri, prețuri
- `background_color` - pentru fundal header și rezumat

### Varianta 2: Extinsă (3 culori + variante)
Folosim cele 3 culori + generăm variante deschise/închise:
- `primary_color` - accent principal
- `accent_color` - accent secundar (butoane, badge-uri)
- `background_color` - fundal închis
- `background_color_light` - variantă deschisă pentru gradient
- `accent_color_light` - variantă deschisă pentru fundal selected

### Varianta 3: Completă (5-6 culori)
Adăugăm culori noi în store:
- `primary_color` - accent principal
- `accent_color` - accent secundar
- `background_color` - fundal închis
- `text_color` - culoare text principală (opțional)
- `text_secondary_color` - culoare text secundară (opțional)
- `border_color` - culoare border-uri (opțional)

## Recomandare:
**Varianta 2** - folosim cele 3 culori existente și generăm variante deschise/închise programatic pentru:
- Fundal selected (variantă deschisă a accent_color)
- Gradient background (variantă deschisă a background_color)
- Border separator (variantă mai deschisă a background_color)

## Întrebări pentru discuție:
1. Vrem să adăugăm culori noi în store sau să folosim doar cele 3 existente?
2. Vrem să generăm variante deschise/închise automat sau să le adăugăm manual în store?
3. Ce elemente sunt prioritare pentru personalizare?
4. Vrem să păstrăm unele culori fixe (ex: alb pentru carduri, gri pentru text secundar)?
