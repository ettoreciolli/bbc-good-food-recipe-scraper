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
    /** Index of the line's "and"-split segment the match came from. */
    segmentIndex: number;
    name: string;
    /** Character offset of the matched phrase within the segment's words. */
    letterIndex: number;
    /** Length of the matched phrase (non-normalized words plus spaces). */
    phraseLength: number;
  }

  /** Result of matching recipe lines against the known ingredients. */
  interface MatchResult {
    ingredientsParsed: ParsedIngredient[];
    notFoundIngredients: number[];
  }
}
