import pluralize from "pluralize";

/** A normalized word together with the index of the word it came from. */
interface NormalizedWord {
  originalIndex: number;
  normalized: string;
}

/** A matched ingredient together with where it sits in the original words. */
interface WordMatch {
  ingredient: App.MatchableIngredient;
  letterIndex: number;
  phraseLength: number;
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
 * left-most matching window wins. Returns the matched ingredient along with the
 * letter index and length of the matched phrase within the (non-normalized)
 * words, or null when nothing matches.
 */
function findMatchesInWords(
  words: string[],
  dict: Map<string, App.MatchableIngredient>,
  maxWords: number
): WordMatch | null {
  const normalized = normalize(words.join(" "));
  for (let n = Math.min(maxWords, normalized.length); n >= 1; n--) {
    for (let i = 0; i + n <= normalized.length; i++) {
      const slice = normalized.slice(i, i + n);
      const gram = slice.map((word) => word.normalized).join(" ");
      const hit = dict.get(gram);
      if (hit) {
        const firstOriginal = slice[0].originalIndex;
        const lastOriginal = slice[slice.length - 1].originalIndex;

        // Letter index: count the non-normalized words (and the single spaces
        // between them) before the gram's first word.
        let letterIndex = 0;
        for (let k = 0; k < firstOriginal; k++) {
          letterIndex += words[k].length + 1;
        }

        // Phrase length: all the non-normalized words the gram spans, plus the
        // spaces between them.
        let phraseLength = lastOriginal - firstOriginal;
        for (let k = firstOriginal; k <= lastOriginal; k++) {
          phraseLength += words[k].length;
        }

        return {
          ingredient: hit,
          letterIndex: letterIndex,
          phraseLength: phraseLength,
        };
      }
    }
  }
  return null;
}

/**
 * Match a scraped recipe's ingredient lines against the known ingredients from
 * the database.
 *
 * Each plain-text ingredient line is split on the word "and" (commas are left
 * intact) into segments, and every segment is checked individually, so a line
 * like "salt and freshly ground black pepper" is matched as "salt" and "freshly
 * ground black pepper" separately. All matches found across the segments of a
 * line point back to that same line index. Amounts and descriptors are ignored
 * via normalization.
 *
 * Returns the built ingredientLines (text + segments) alongside the matches.
 */
export default function matchIngredients(
  scrapedRecipe: App.ScrapedRecipe,
  dbIngredients: App.MatchableIngredient[]
): App.MatchResult {
  const ingredients = (scrapedRecipe && scrapedRecipe.ingredients) || [];
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

  const ingredientLines: App.IngredientLine[] = [];
  const ingredientsParsed: App.ParsedIngredient[] = [];
  const notFoundIngredients: number[] = [];

  ingredients.forEach((text, index) => {
    // Split on the word "and" only (leave commas intact) and check each
    // segment individually. Matches from every segment share this line index.
    const lineText = String(text == null ? "" : text);
    const segments = lineText.split(/\s+and\s+/i);
    ingredientLines.push({ text: lineText, segments: segments });

    const seen: { [id: string]: boolean } = {}; // dedupe by id within this line
    let matchedThisLine = false;

    segments.forEach((segment, segmentIndex) => {
      const words = segment.toLowerCase().split(" ").filter(Boolean);
      const match = findMatchesInWords(words, dict, maxWords);
      if (match && !seen[match.ingredient.id]) {
        seen[match.ingredient.id] = true;
        matchedThisLine = true;
        ingredientsParsed.push({
          id: match.ingredient.id,
          index: index,
          segmentIndex: segmentIndex,
          name: match.ingredient.name,
          letterIndex: match.letterIndex,
          phraseLength: match.phraseLength,
        });
      }
    });

    if (!matchedThisLine) {
      notFoundIngredients.push(index);
    }
  });

  return {
    ingredientLines: ingredientLines,
    ingredientsParsed: ingredientsParsed,
    notFoundIngredients: notFoundIngredients,
  };
}
