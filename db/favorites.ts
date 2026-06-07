import { query } from "./index";

/** List a user's favorited recipes, newest first, with ingredient counts. */
export function getFavorites(
  userId: string
): Promise<App.FavoriteRecipeRow[]> {
  return query<App.FavoriteRecipeRow>(
    "SELECT f.recipe_id, pr.url, pr.title, f.created_at, " +
      "(SELECT COUNT(*)::int FROM recipe_ingredients ri " +
      "WHERE ri.recipe_id = pr.id) AS ingredient_count " +
      "FROM favorites f " +
      "JOIN parsed_recipes pr ON pr.id = f.recipe_id " +
      "WHERE f.user_id = $1 " +
      "ORDER BY f.created_at DESC",
    [userId]
  );
}

/** Favorite a recipe for a user (no-op if already favorited). */
export function addFavorite(
  userId: string,
  recipeId: string
): Promise<void> {
  return query(
    "INSERT INTO favorites (user_id, recipe_id) VALUES ($1, $2) " +
      "ON CONFLICT (user_id, recipe_id) DO NOTHING",
    [userId, recipeId]
  ).then(() => undefined);
}

/** Remove a favorite. Resolves true when a row was actually removed. */
export function removeFavorite(
  userId: string,
  recipeId: string
): Promise<boolean> {
  return query<{ recipe_id: string }>(
    "DELETE FROM favorites WHERE user_id = $1 AND recipe_id = $2 " +
      "RETURNING recipe_id",
    [userId, recipeId]
  ).then((rows) => rows.length > 0);
}
