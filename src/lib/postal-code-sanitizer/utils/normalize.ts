/**
 * Utilitare pentru normalizare text (eliminare diacritice, lowercase, etc.)
 */

/**
 * Elimină diacriticele dintr-un text și convertește la lowercase
 * Ex: "Vâlcea" -> "valcea", "Drăgășani" -> "dragasani"
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Elimină diacriticele
    .trim();
}

/**
 * Elimină spațiile multiple și caracterele speciale
 */
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ") // Spații multiple -> un singur spațiu
    .replace(/[^\w\s]/g, "") // Elimină caractere speciale (păstrează litere, cifre, spații)
    .trim();
}
