import { query } from "./index";

/**
 * Look up the given ingredient ids so their types can be validated before a
 * recipe is saved. Returns only the rows that actually exist.
 */
export function getIngredientsByIds(
  ids: string[]
): Promise<App.IngredientRow[]> {
  if (!ids.length) {
    return Promise.resolve([]);
  }
  const placeholders = ids
    .map((_id, i) => "$" + (i + 1))
    .join(", ");
  return query<App.IngredientRow>(
    "SELECT id, name, ingredient_type FROM ingredient WHERE id IN (" +
      placeholders +
      ")",
    ids
  );
}

/**
 * Upsert a parsed recipe by url and (re)write its ingredient rows. Any existing
 * ingredient rows for the recipe are replaced so re-saving the same url stays
 * idempotent. Resolves with the recipe id and number of ingredient rows saved.
 *
 * Note: the Neon HTTP driver runs each statement on its own round trip, so this
 * is a sequence of statements rather than a single transaction.
 */
export function saveParsedRecipe(
  url: string,
  title: string | null,
  rows: App.SaveRecipeIngredient[]
): Promise<{ recipeId: string; count: number }> {
  return query<{ id: string }>(
    "INSERT INTO parsed_recipes (url, title) VALUES ($1, $2) " +
      "ON CONFLICT (url) DO UPDATE SET title = EXCLUDED.title RETURNING id",
    [url, title]
  )
    .then((recipeRows) => {
      const recipeId = recipeRows[0].id;
      return query("DELETE FROM recipe_ingredients WHERE recipe_id = $1", [
        recipeId,
      ]).then(() => recipeId);
    })
    .then((recipeId) => {
      if (!rows.length) {
        return { recipeId: recipeId, count: 0 };
      }

      const values: unknown[] = [];
      const tuples = rows.map((row, i) => {
        const base = i * 6;
        values.push(
          recipeId,
          row.ingredient_id,
          row.line_index,
          row.segment_index,
          row.unit,
          row.quantity
        );
        return (
          "($" +
          (base + 1) +
          ", $" +
          (base + 2) +
          ", $" +
          (base + 3) +
          ", $" +
          (base + 4) +
          ", $" +
          (base + 5) +
          ", $" +
          (base + 6) +
          ")"
        );
      });

      const sql =
        "INSERT INTO recipe_ingredients " +
        "(recipe_id, ingredient_id, line_index, segment_index, unit, quantity) " +
        "VALUES " +
        tuples.join(", ");

      return query(sql, values).then(() => ({
        recipeId: recipeId,
        count: rows.length,
      }));
    });
}
