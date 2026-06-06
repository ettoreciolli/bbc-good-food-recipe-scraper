var pluralize = require("pluralize");

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
function normalize(text) {
  return String(text == null ? "" : text)
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map(function (word) {
      return word ? pluralize.singular(word) : word;
    })
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
 *
 * @param {string[]} lines - the recipe ingredient lines
 * @param {Array<{ id: string, name: string }>} dbIngredients - known ingredients
 * @returns {{
 *   ingredientsParsed: Array<{ id: string, index: number, name: string }>,
 *   notFoundIngredients: number[]
 * }}
 *   ingredientsParsed holds one entry per matched ingredient with the index of
 *   the line it came from; notFoundIngredients holds the indexes of the lines
 *   that matched nothing.
 */
function matchIngredients(lines, dbIngredients) {
  lines = lines || [];
  dbIngredients = dbIngredients || [];

  // Build a lookup of normalized ingredient name -> list of ingredients, and
  // track the longest name (in words) so we know how wide the n-gram windows
  // need to be.
  var dict = new Map();
  var maxWords = 1;
  dbIngredients.forEach(function (ing) {
    var name = normalize(ing.name);
    if (!name) {
      return;
    }
    var wordCount = name.split(" ").length;
    if (wordCount > maxWords) {
      maxWords = wordCount;
    }
    if (!dict.has(name)) {
      dict.set(name, []);
    }
    dict.get(name).push({ id: ing.id, name: ing.name });
  });

  var ingredientsParsed = [];
  var notFoundIngredients = [];

  lines.forEach(function (line, index) {
    var words = normalize(line).split(" ").filter(Boolean);
    var seen = {}; // dedupe by ingredient id within this line
    var matchedThisLine = false;

    for (var n = Math.min(maxWords, words.length); n >= 1; n--) {
      for (var i = 0; i + n <= words.length; i++) {
        var gram = words.slice(i, i + n).join(" ");
        if (!dict.has(gram)) {
          continue;
        }
        dict.get(gram).forEach(function (ing) {
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

module.exports = matchIngredients;
