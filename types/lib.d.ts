// Types for the ingredient matching library (lib/matchIngredients).

declare namespace App {
  /** Minimal ingredient shape the matcher needs to work with. */
  interface MatchableIngredient {
    id: string;
    name: string;
  }

  /** A matched ingredient tied back to the recipe line it came from. */
  interface ParsedIngredient {
    id: string;
    index: number;
    name: string;
  }

  /** Result of matching recipe lines against the known ingredients. */
  interface MatchResult {
    ingredientsParsed: ParsedIngredient[];
    notFoundIngredients: number[];
  }
}
