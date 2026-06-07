import express, { Request, Response, NextFunction } from "express";
import {
  getIngredients,
  addIngredients,
  deleteIngredient,
} from "../../db/ingredients";

const router = express();

const VALID_TYPES: { [key: string]: boolean } = { liquid: true, solid: true };

// CORS for every ingredient route (including /:id), not just "/".
router.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "X-Requested-With, Content-Type"
  );
  next();
});

/**
 * List every ingredient in the table so the UI can show/manage them.
 */
router.get("/", (req: Request, res: Response) => {
  getIngredients()
    .then((ingredients) => {
      res.send({ ingredients: ingredients });
    })
    .catch((err) => {
      console.error("Failed to load ingredients:", err);
      res.status(500).send({ error: "Failed to load ingredients" });
    });
});

/**
 * Save one or more new ingredients to the ingredient table.
 * Expects a JSON body of the form:
 *   { ingredients: [{ name: string, type: "liquid" | "solid" }, ...] }
 */
router.post("/", (req: Request, res: Response) => {
  const body = (req.body || {}) as Partial<App.AddIngredientsBody>;
  const ingredients = body.ingredients || [];

  const cleaned: App.NewIngredient[] = [];
  for (let i = 0; i < ingredients.length; i++) {
    const name = (ingredients[i].name || "").trim();
    const type = ingredients[i].type;

    if (!name) {
      continue; // skip blank rows
    }
    if (!VALID_TYPES[type]) {
      res
        .status(400)
        .send({ error: "Ingredient type must be 'liquid' or 'solid'" });
      return;
    }
    cleaned.push({ name: name, type: type });
  }

  if (!cleaned.length) {
    res.status(400).send({ error: "No ingredients to save" });
    return;
  }

  addIngredients(cleaned)
    .then((saved) => {
      res.send({ saved: saved });
    })
    .catch((err) => {
      console.error("Failed to save ingredients:", err);
      res.status(500).send({ error: "Failed to save ingredients" });
    });
});

/**
 * Delete a single ingredient by id (used when splitting a saved ingredient
 * into several, where the original is replaced by the new ones).
 */
router.delete("/:id", (req: Request, res: Response) => {
  const id = req.params.id;
  deleteIngredient(id)
    .then((deleted) => {
      if (!deleted) {
        res.status(404).send({ error: "Ingredient not found" });
        return;
      }
      res.send({ deleted: id });
    })
    .catch((err) => {
      console.error("Failed to delete ingredient:", err);
      res.status(500).send({ error: "Failed to delete ingredient" });
    });
});

export default router;
