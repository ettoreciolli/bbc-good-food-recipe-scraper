// Types for the HTTP routes: the scraped recipe shape and the request/response
// payloads exchanged with the frontend.

declare namespace App {
  interface RecipeTime {
    preparation?: string | null;
    cooking?: string | null;
    prep?: string;
    cook?: string;
  }

  interface RecipeRating {
    average: number | null;
    count: number | null;
    total: number | null;
  }

  /** A single ingredient line and the "and"-split segments it breaks into. */
  interface IngredientLine {
    text: string;
    segments: string[];
  }

  /** The recipe object returned by GET /api/scrape. */
  interface Recipe {
    title: string | null;
    cuisine: string | null;
    ingredientLines: IngredientLine[];
    ingredientsParsed: ParsedIngredient[];
    notFoundIngredients: number[];
    method: string[];
    time: RecipeTime;
    serves: string | null;
    rating: RecipeRating;
    self_url: string;
    image?: string;
  }

  /** Generic error payload returned by the API. */
  interface ErrorResponse {
    error: string;
  }

  /** Query string for GET /api/scrape. */
  interface ScrapeQuery {
    url?: string;
  }

  /** Body for POST /api/ingredients. */
  interface AddIngredientsBody {
    ingredients: NewIngredient[];
  }

  /** Response for POST /api/ingredients. */
  interface AddIngredientsResponse {
    saved: SavedIngredient[];
  }
}
