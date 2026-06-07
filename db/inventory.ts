import { query } from "./index";

/** List a user's kitchen inventory, joined with the ingredient details. */
export function getInventory(
  userId: string
): Promise<App.InventoryItemRow[]> {
  return query<App.InventoryItemRow>(
    "SELECT inv.id, inv.ingredient_id, i.name, i.ingredient_type, " +
      "inv.quantity, inv.unit " +
      "FROM inventory inv " +
      "JOIN ingredient i ON i.id = inv.ingredient_id " +
      "WHERE inv.user_id = $1 " +
      "ORDER BY i.name",
    [userId]
  );
}

/**
 * Add or update an inventory item for a user (one row per ingredient). The unit
 * and quantity are overwritten when the ingredient is already on hand.
 */
export function upsertInventory(
  userId: string,
  ingredientId: string,
  quantity: string | null,
  unit: string | null
): Promise<void> {
  return query(
    "INSERT INTO inventory (user_id, ingredient_id, quantity, unit) " +
      "VALUES ($1, $2, $3, $4) " +
      "ON CONFLICT (user_id, ingredient_id) DO UPDATE SET " +
      "quantity = EXCLUDED.quantity, unit = EXCLUDED.unit, updated_at = now()",
    [userId, ingredientId, quantity, unit]
  ).then(() => undefined);
}

/** Remove an inventory item. Resolves true when a row was actually removed. */
export function removeInventory(
  userId: string,
  ingredientId: string
): Promise<boolean> {
  return query<{ id: string }>(
    "DELETE FROM inventory WHERE user_id = $1 AND ingredient_id = $2 " +
      "RETURNING id",
    [userId, ingredientId]
  ).then((rows) => rows.length > 0);
}
