import { query } from "./index";

/**
 * List saved recipes, newest first, with a count of their ingredient rows, for
 * the browse view.
 */
export function getParsedRecipes(): Promise<App.ParsedRecipeRow[]> {
  return query<App.ParsedRecipeRow>(
    "SELECT pr.id, pr.url, pr.title, pr.created_at, " +
      "COUNT(ri.id)::int AS ingredient_count " +
      "FROM parsed_recipes pr " +
      "LEFT JOIN recipe_ingredients ri ON ri.recipe_id = pr.id " +
      "GROUP BY pr.id " +
      "ORDER BY pr.created_at DESC"
  );
}

/**
 * Ensure a parsed_recipes row exists for a url (creating it if needed) and
 * return its id. Used when favoriting a recipe that hasn't been fully saved.
 */
export function getOrCreateRecipeByUrl(
  url: string,
  title: string | null
): Promise<string> {
  return query<{ id: string }>(
    "INSERT INTO parsed_recipes (url, title) VALUES ($1, $2) " +
      "ON CONFLICT (url) DO UPDATE SET " +
      "title = COALESCE(EXCLUDED.title, parsed_recipes.title) RETURNING id",
    [url, title]
  ).then((rows) => rows[0].id);
}

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
