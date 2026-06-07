import express, { Request, Response, NextFunction } from "express";
import { requireAuth } from "../../lib/auth";
import { getOrCreateRecipeByUrl } from "../../db/recipes";
import {
  getFavorites,
  addFavorite,
  removeFavorite,
} from "../../db/favorites";

const router = express();

router.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
  next();
});

// Every favorites route requires a signed-in user.
router.use(requireAuth);

/** List the signed-in user's favorite recipes. */
router.get("/", (req: Request, res: Response) => {
  getFavorites(res.locals.userId)
    .then((favorites) => {
      res.send({ favorites: favorites });
    })
    .catch((err) => {
      console.error("Failed to load favorites:", err);
      res.status(500).send({ error: "Failed to load favorites" });
    });
});

/**
 * Favorite a recipe by url. The recipe row is created if it doesn't exist yet
 * (auto-save), then linked to the user.
 */
router.post("/", (req: Request, res: Response) => {
  const body = (req.body || {}) as Partial<App.AddFavoriteBody>;
  const url = (body.url || "").trim();
  if (!url) {
    res.status(400).send({ error: "A recipe url is required" });
    return;
  }

  getOrCreateRecipeByUrl(url, body.title || null)
    .then((recipeId) =>
      addFavorite(res.locals.userId, recipeId).then(() => {
        res.send({ recipe_id: recipeId });
      })
    )
    .catch((err) => {
      console.error("Failed to add favorite:", err);
      res.status(500).send({ error: "Failed to add favorite" });
    });
});

/** Remove a favorite by recipe id. */
router.delete("/:recipeId", (req: Request, res: Response) => {
  removeFavorite(res.locals.userId, req.params.recipeId)
    .then((removed) => {
      if (!removed) {
        res.status(404).send({ error: "Favorite not found" });
        return;
      }
      res.send({ removed: req.params.recipeId });
    })
    .catch((err) => {
      console.error("Failed to remove favorite:", err);
      res.status(500).send({ error: "Failed to remove favorite" });
    });
});

export default router;
