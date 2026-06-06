import pluralize from "pluralize";

/** A normalized word together with the index of the word it came from. */
interface NormalizedWord {
  originalIndex: number;
  normalized: string;
}

/**
 * Strip everything that isn't a lower-case word so that quantities, units,
 * punctuation and fractions don't interfere with matching, then reduce each
 * word to its singular form so plurals match their singular counterparts
 * (e.g. "garlic cloves" -> "garlic clove").
 *
 * Returns one entry per resulting word, each carrying the index of the
 * original (whitespace-split) word it came from. A single original word can
 * yield several normalized words (e.g. "400g/14oz" -> "g", "oz").
 */
function normalize(text: string | null | undefined): NormalizedWord[] {
  const result: NormalizedWord[] = [];
  String(text == null ? "" : text)
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .forEach((word, originalIndex) => {
      word
        .replace(/[^a-z]/g, " ")
        .split(/\s+/)
        .filter(Boolean)
        .forEach((part) => {
          result.push({
            originalIndex: originalIndex,
            normalized: pluralize.singular(part),
          });
        });
    });
  return result;
}

/**
 * Find the first known ingredient mentioned in a list of words by normalizing
 * them (stripping quantities/units/punctuation and singularizing), then looking
 * up each word window (n-gram) against the ingredient names. The longest,
 * left-most matching window wins. Returns null when nothing matches.
 */
function findMatchesInWords(
  words: string[],
  dict: Map<string, App.MatchableIngredient>,
  maxWords: number
): App.MatchableIngredient | null {
  const normalized = normalize(words.join(" "));
  for (let n = Math.min(maxWords, normalized.length); n >= 1; n--) {
    for (let i = 0; i + n <= normalized.length; i++) {
      const gram = normalized
        .slice(i, i + n)
        .map((word) => word.normalized)
        .join(" ");
      const hit = dict.get(gram);
      if (hit) {
        return hit;
      }
    }
  }
  return null;
}

/**
 * Match each recipe ingredient line against the known ingredients from the
 * database.
 *
 * Each line is first split on the word "and" (commas are left intact) and
 * every resulting segment is checked individually, so a line like "salt and
 * freshly ground black pepper" is matched as "salt" and "freshly ground black
 * pepper" separately. All matches found across the segments of a line point
 * back to that same line index. Amounts and descriptors are ignored via
 * normalization, and a segment can still match multiple ingredients.
 */
export default function matchIngredients(
  lines: string[],
  dbIngredients: App.MatchableIngredient[]
): App.MatchResult {
  lines = lines || [];
  dbIngredients = dbIngredients || [];

  // Build a lookup of normalized ingredient name -> ingredient (the first one
  // seen for a given name wins), and track the longest name (in words) so we
  // know how wide the n-gram windows need to be.
  const dict = new Map<string, App.MatchableIngredient>();
  let maxWords = 1;
  dbIngredients.forEach((ing) => {
    const parts = normalize(ing.name);
    const name = parts.map((word) => word.normalized).join(" ");
    if (!name) {
      return;
    }
    const wordCount = parts.length;
    if (wordCount > maxWords) {
      maxWords = wordCount;
    }
    if (!dict.has(name)) {
      dict.set(name, { id: ing.id, name: ing.name });
    }
  });

  const ingredientsParsed: App.ParsedIngredient[] = [];
  const notFoundIngredients: number[] = [];

  lines.forEach((line, index) => {
    // Split on the word "and" only (leave commas intact) and check each
    // segment individually. Matches from every segment share this line index.
    const segments = String(line == null ? "" : line).split(/\s+and\s+/i);
    const seen: { [id: string]: boolean } = {}; // dedupe by id within this line
    let matchedThisLine = false;

    segments.forEach((segment) => {
      const words = segment.toLowerCase().split(" ").filter(Boolean);
      const ing = findMatchesInWords(words, dict, maxWords);
      if (ing && !seen[ing.id]) {
        seen[ing.id] = true;
        matchedThisLine = true;
        ingredientsParsed.push({
          id: ing.id,
          index: index,
          name: ing.name,
        });
      }
    });

    if (!matchedThisLine) {
      notFoundIngredients.push(index);
    }
  });

  return {
    ingredientsParsed: ingredientsParsed,
    notFoundIngredients: notFoundIngredients,
  };
}
