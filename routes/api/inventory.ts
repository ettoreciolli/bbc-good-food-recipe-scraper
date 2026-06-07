import express, { Request, Response, NextFunction } from "express";
import { requireAuth } from "../../lib/auth";
import { getIngredientsByIds } from "../../db/recipes";
import {
  getInventory,
  upsertInventory,
  removeInventory,
} from "../../db/inventory";
import { isUnitValidForType } from "../../lib/parseMeasurement";

const router = express();

router.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
  next();
});

router.use(requireAuth);

/** List the signed-in user's kitchen inventory. */
router.get("/", (req: Request, res: Response) => {
  getInventory(res.locals.userId)
    .then((items) => {
      res.send({ items: items });
    })
    .catch((err) => {
      console.error("Failed to load inventory:", err);
      res.status(500).send({ error: "Failed to load inventory" });
    });
});

/**
 * Add or update an inventory item. Validates that the ingredient exists and
 * that the unit (if any) is valid for the ingredient's solid/liquid type.
 */
router.post("/", (req: Request, res: Response) => {
  const body = (req.body || {}) as Partial<App.SetInventoryBody>;
  const ingredientId = (body.ingredient_id || "").trim();
  const quantity = body.quantity != null ? String(body.quantity).trim() : null;
  const unit = body.unit != null ? String(body.unit).trim() || null : null;

  if (!ingredientId) {
    res.status(400).send({ error: "An ingredient is required" });
    return;
  }

  getIngredientsByIds([ingredientId])
    .then((rows) => {
      if (!rows.length) {
        res.status(404).send({ error: "Unknown ingredient" });
        return undefined;
      }
      if (!isUnitValidForType(unit, rows[0].ingredient_type)) {
        res.status(400).send({
          error:
            "Unit '" +
            unit +
            "' isn't valid for a " +
            rows[0].ingredient_type +
            " ingredient",
        });
        return undefined;
      }
      return upsertInventory(
        res.locals.userId,
        ingredientId,
        quantity || null,
        unit
      ).then(() => {
        res.send({ saved: ingredientId });
      });
    })
    .catch((err) => {
      console.error("Failed to save inventory item:", err);
      res.status(500).send({ error: "Failed to save inventory item" });
    });
});

/** Remove an inventory item by ingredient id. */
router.delete("/:ingredientId", (req: Request, res: Response) => {
  removeInventory(res.locals.userId, req.params.ingredientId)
    .then((removed) => {
      if (!removed) {
        res.status(404).send({ error: "Inventory item not found" });
        return;
      }
      res.send({ removed: req.params.ingredientId });
    })
    .catch((err) => {
      console.error("Failed to remove inventory item:", err);
      res.status(500).send({ error: "Failed to remove inventory item" });
    });
});

export default router;
