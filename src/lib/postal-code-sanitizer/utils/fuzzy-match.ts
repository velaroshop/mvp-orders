/**
 * Fuzzy matching simplu folosind Levenshtein distance
 * Varianta simplă și rapidă pentru matching text cu erori de scriere
 */

/**
 * Calculează distanța Levenshtein între două stringuri
 * (numărul minim de operații pentru a transforma un string în altul)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  // Inițializare matrice
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Calcul distanță
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // ștergere
          matrix[i][j - 1] + 1,     // inserare
          matrix[i - 1][j - 1] + 1  // substituție
        );
      }
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculează similaritatea între două stringuri (0-1, unde 1 = identic)
 */
function similarity(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  
  const distance = levenshteinDistance(str1, str2);
  return 1 - distance / maxLen;
}

/**
 * Găsește cel mai bun match dintr-o listă de opțiuni
 * @param input Textul de căutat
 * @param options Lista de opțiuni posibile
 * @param threshold Prag minim de similaritate (0-1). Default: 0.7
 * @returns Cel mai bun match sau null dacă nu găsește nimic peste threshold
 */
export function findBestMatch(
  input: string,
  options: string[],
  threshold: number = 0.7
): { match: string; similarity: number } | null {
  if (!input || options.length === 0) return null;

  const normalizedInput = input.toLowerCase().trim();
  let bestMatch: { match: string; similarity: number } | null = null;
  let bestScore = 0;

  for (const option of options) {
    const normalizedOption = option.toLowerCase().trim();
    
    // Verifică match exact mai întâi (cel mai rapid)
    if (normalizedInput === normalizedOption) {
      return { match: option, similarity: 1.0 };
    }

    // Verifică dacă unul conține pe celălalt (match parțial)
    if (normalizedInput.includes(normalizedOption) || normalizedOption.includes(normalizedInput)) {
      const partialScore = Math.min(normalizedInput.length, normalizedOption.length) / 
                          Math.max(normalizedInput.length, normalizedOption.length);
      if (partialScore > bestScore && partialScore >= threshold) {
        bestScore = partialScore;
        bestMatch = { match: option, similarity: partialScore };
      }
    }

    // Calculează similaritatea folosind Levenshtein
    const sim = similarity(normalizedInput, normalizedOption);
    if (sim > bestScore && sim >= threshold) {
      bestScore = sim;
      bestMatch = { match: option, similarity: sim };
    }
  }

  return bestMatch;
}
