import express, { Request, Response, NextFunction } from "express";
import {
  getParsedRecipes,
  getIngredientsByIds,
  saveParsedRecipe,
} from "../../db/recipes";
import { isUnitValidForType } from "../../lib/parseMeasurement";

const router = express();

router.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
  next();
});

/** List saved recipes (newest first) for the browse view. */
router.get("/", (req: Request, res: Response) => {
  getParsedRecipes()
    .then((recipes) => {
      res.send({ recipes: recipes });
    })
    .catch((err) => {
      console.error("Failed to load recipes:", err);
      res.status(500).send({ error: "Failed to load recipes" });
    });
});

/**
 * Save a settled recipe and its ingredient rows. Re-validates server-side that
 * every ingredient exists and that each unit is valid for its ingredient's
 * type, refusing to persist anything when a line still has a problem.
 *
 * Body: { url, title?, ingredients: [{ ingredient_id, line_index,
 *         segment_index, unit, quantity }] }
 */
router.post("/", (req: Request, res: Response) => {
  const body = (req.body || {}) as Partial<App.SaveRecipeBody>;
  const url = (body.url || "").trim();
  const ingredients = body.ingredients || [];

  if (!url) {
    res.status(400).send({ error: "A recipe url is required" });
    return;
  }
  if (!ingredients.length) {
    res.status(400).send({ error: "No ingredients to save" });
    return;
  }

  for (let i = 0; i < ingredients.length; i++) {
    const ing = ingredients[i];
    if (
      !ing ||
      !ing.ingredient_id ||
      typeof ing.line_index !== "number" ||
      typeof ing.segment_index !== "number"
    ) {
      res.status(400).send({ error: "Malformed ingredient in request" });
      return;
    }
  }

  const ids = ingredients.map((ing) => ing.ingredient_id);

  getIngredientsByIds(ids)
    .then((rows) => {
      const typeById: { [id: string]: App.IngredientType } = {};
      rows.forEach((row) => {
        typeById[row.id] = row.ingredient_type;
      });

      const problems: string[] = [];
      ingredients.forEach((ing) => {
        const type = typeById[ing.ingredient_id];
        if (!type) {
          problems.push("Unknown ingredient id " + ing.ingredient_id);
          return;
        }
        if (!isUnitValidForType(ing.unit, type)) {
          problems.push(
            "Unit '" + ing.unit + "' isn't valid for a " + type + " ingredient"
          );
        }
      });

      if (problems.length) {
        res.status(400).send({ error: problems.join("; ") });
        return undefined;
      }

      return saveParsedRecipe(url, body.title || null, ingredients).then(
        (result) => {
          res.send({ recipe_id: result.recipeId, saved: result.count });
        }
      );
    })
    .catch((err) => {
      console.error("Failed to save recipe:", err);
      res.status(500).send({ error: "Failed to save recipe" });
    });
});

export default router;
