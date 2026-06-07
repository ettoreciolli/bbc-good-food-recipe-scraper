// Types for the ingredient matching library (lib/matchIngredients).

declare namespace App {
  /** Minimal ingredient shape the matcher needs to work with. */
  interface MatchableIngredient {
    id: string;
    name: string;
    type: IngredientType;
  }

  /** A matched ingredient tied back to the recipe line it came from. */
  interface ParsedIngredient {
    id: string;
    index: number;
    /** Index of the line's "and"-split segment the match came from. */
    segmentIndex: number;
    name: string;
    /** Solid/liquid type of the matched ingredient (drives unit validation). */
    type: IngredientType;
    /** Character offset of the matched phrase within the segment's words. */
    letterIndex: number;
    /** Length of the matched phrase (non-normalized words plus spaces). */
    phraseLength: number;
    /** Parsed amount as written, e.g. "2", "1/2", "2-3" (added by the route). */
    amount?: string | null;
    /** Canonical parsed unit, e.g. "g", "ml", "tbsp" (added by the route). */
    unit?: string | null;
    /** Set when the amount/unit couldn't be parsed cleanly (added by route). */
    parseError?: string | null;
  }

  /** Result of matching recipe lines against the known ingredients. */
  interface MatchResult {
    ingredientLines: IngredientLine[];
    ingredientsParsed: ParsedIngredient[];
    notFoundIngredients: number[];
  }
}
