import pluralize from "pluralize";

/**
 * Strip everything that isn't a lower-case word so that quantities, units,
 * punctuation and fractions don't interfere with matching, then reduce each
 * word to its singular form so plurals match their singular counterparts
 * (e.g. "2 garlic cloves" -> "garlic clove"). The same normalization is
 * applied to both the recipe lines and the database names, so they meet in
 * the middle.
 *
 * "400g/14oz short pasta, such as penne" -> "g oz short pasta such as penne"
 */
function normalize(text: string | null | undefined): string {
  return String(text == null ? "" : text)
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) => (word ? pluralize.singular(word) : word))
    .join(" ");
}

/**
 * Match each recipe ingredient line against the known ingredients from the
 * database.
 *
 * Amounts and descriptors are ignored: each line is normalized to its words
 * and every word window (n-gram) is looked up against the ingredient names.
 * A single line can match multiple ingredients (e.g. "salt and freshly
 * ground black pepper" matches both "salt" and "black pepper").
 */
export default function matchIngredients(
  lines: string[],
  dbIngredients: App.MatchableIngredient[]
): App.MatchResult {
  lines = lines || [];
  dbIngredients = dbIngredients || [];

  // Build a lookup of normalized ingredient name -> list of ingredients, and
  // track the longest name (in words) so we know how wide the n-gram windows
  // need to be.
  const dict = new Map<string, App.MatchableIngredient[]>();
  let maxWords = 1;
  dbIngredients.forEach((ing) => {
    const name = normalize(ing.name);
    if (!name) {
      return;
    }
    const wordCount = name.split(" ").length;
    if (wordCount > maxWords) {
      maxWords = wordCount;
    }
    if (!dict.has(name)) {
      dict.set(name, []);
    }
    dict.get(name)!.push({ id: ing.id, name: ing.name });
  });

  const ingredientsParsed: App.ParsedIngredient[] = [];
  const notFoundIngredients: number[] = [];

  lines.forEach((line, index) => {
    const words = normalize(line).split(" ").filter(Boolean);
    const seen: { [id: string]: boolean } = {}; // dedupe by id within this line
    let matchedThisLine = false;

    for (let n = Math.min(maxWords, words.length); n >= 1; n--) {
      for (let i = 0; i + n <= words.length; i++) {
        const gram = words.slice(i, i + n).join(" ");
        if (!dict.has(gram)) {
          continue;
        }
        dict.get(gram)!.forEach((ing) => {
          if (seen[ing.id]) {
            return;
          }
          seen[ing.id] = true;
          matchedThisLine = true;
          ingredientsParsed.push({
            id: ing.id,
            index: index,
            name: ing.name,
          });
        });
      }
    }

    if (!matchedThisLine) {
      notFoundIngredients.push(index);
    }
  });

  return {
    ingredientsParsed: ingredientsParsed,
    notFoundIngredients: notFoundIngredients,
  };
}
