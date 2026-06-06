import express, { Request, Response, NextFunction } from "express";
import request from "request";
import cheerio from "cheerio";
import { parse } from "iso8601-duration";
import { getIngredients } from "../../db/ingredients";
import matchIngredients from "../../lib/matchIngredients";

const router = express();

/**
 * Fetch the known ingredients from the database, match them against the
 * scraped recipe ingredient lines and attach the results to the recipe before
 * sending the response. The database access lives in db/ingredients.ts and the
 * matching logic in lib/matchIngredients.ts, so the handler only orchestrates.
 */
function sendRecipeWithMatches(res: Response, recipe: App.Recipe): void {
  getIngredients()
    .then((dbIngredients) => {
      const result = matchIngredients(recipe.ingredients, dbIngredients);
      recipe.ingredientsParsed = result.ingredientsParsed;
      recipe.notFoundIngredients = result.notFoundIngredients;
      res.send(recipe);
    })
    .catch((err) => {
      // Don't fail the whole scrape if ingredient matching is unavailable.
      console.error("Ingredient matching failed:", err);
      recipe.ingredientsParsed = [];
      recipe.notFoundIngredients = [];
      res.send(recipe);
    });
}

router.all("/", (req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

router.get("/", (req: Request, res: Response) => {
  const url = (req.query.url as string) || "";
  const recipe: App.Recipe = {
    title: null,
    cuisine: null,
    ingredients: [],
    ingredientsParsed: [],
    notFoundIngredients: [],
    method: [],
    time: {
      preparation: null,
      cooking: null,
    },
    serves: null,
    rating: {
      average: null,
      count: null,
      total: null,
    },
    self_url: url,
  };

  const requestOptions = {
    url: url,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  };

  request(requestOptions, (err, response, html) => {
    if (err) {
      console.error("Scrape error: request failed for URL:", url, "-", err);
      res.send({ error: "Invalid URI" });
      return;
    }

    const $ = cheerio.load(html);
    try {
      if (url.match(/https:\/\/www.bbcgoodfood.com/)) {
        console.log("Good Food");
        recipe.title = $("h1").text();
        if (!recipe.title || recipe.title.length < 1) {
          console.error(
            "Scrape error: no recipe title found for BBC Good Food URL:",
            url
          );
          res.send({ error: "Not a valid BBC Good Food URL" });
          return;
        }

        $(".recipe__ingredients ul li.list-item").each((index, element) => {
          // Trim string up to line break where ingredient anchor description starts
          const text = $(element).text();
          const lineBreak = text.indexOf("\n");
          if (lineBreak > 0) {
            recipe.ingredients.push(text.substring(0, lineBreak));
          } else {
            recipe.ingredients.push(text);
          }
        });
        $(".recipe__method-steps ul .list-item p").each((index, element) => {
          recipe.method.push($(element).text());
        });
        recipe.time = {
          prep: $(".cook-and-prep-time .list time").first().text(),
          cook: $(".cook-and-prep-time .list time").last().text(),
        };
        recipe.serves = $(".post-header__servings").children().last().text();
        recipe.image = $(".post-header__image-container img").attr("src");
        sendRecipeWithMatches(res, recipe);
        return;
      } else if (url.match(/https:\/\/www.bbc.co.uk\/food\//)) {
        console.log("BBC Food");
        /**
         *  Load Recipe Schema and populate recipe data from that
         */
        const schemaJSON: any[] = ($(
          "script[type='application/ld+json']"
        ) as any)
          .map((i: number, el: any) => JSON.parse(el.children[0].data))
          .get()
          // The recipe may sit at the top level (legacy format) or be
          // nested inside an "@graph" array (current BBC Food format).
          .flatMap((node: any) => node["@graph"] || node);
        const recipeData: any =
          schemaJSON.find((node) => node && node["@type"] === "Recipe") || null;
        if (!recipeData) {
          console.error(
            "Scrape error: no Recipe schema found for BBC Food URL:",
            url
          );
          throw new Error("Recipe not found");
        }
        recipe.title = recipeData.name;
        recipe.ingredients = recipeData.recipeIngredient;
        recipe.method = recipeData.recipeInstructions;

        const prepTime = parse(recipeData.prepTime);
        const cookTime = parse(recipeData.cookTime);
        recipe.time = {
          prep: `${prepTime.hours ? "" + prepTime.hours + " hours" : ""} ${
            prepTime.minutes ? "" + prepTime.minutes + " minutes" : ""
          }`,
          cook: `${cookTime.hours ? "" + cookTime.hours + " hours" : ""} ${
            cookTime.minutes ? "" + cookTime.minutes + " minutes" : ""
          }`,
        };

        recipe.serves = recipeData.recipeYield;
        recipe.image = recipeData.image[0];
        sendRecipeWithMatches(res, recipe);
        return;
      } else {
        console.error("Scrape error: unsupported website for URL:", url);
        res.send({ error: "Website not yet supported" });
      }
    } catch (parseErr) {
      console.error("Scrape error while parsing URL:", url, "-", parseErr);
      res.send({ error: "Invalid URI" });
    }
  });
});

export default router;
