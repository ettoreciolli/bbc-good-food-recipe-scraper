// Database-layer types: the shape of the ingredient table and the values used
// when reading from / writing to it.

declare namespace App {
  /** Physical type stored in the ingredient_type enum column. */
  type IngredientType = "liquid" | "solid";

  /** A row from the ingredient table as returned by getIngredients(). */
  interface IngredientRow {
    id: string;
    name: string;
    ingredient_type: IngredientType;
  }

  /** A new ingredient to insert; id and slug are derived by the data layer. */
  interface NewIngredient {
    name: string;
    type: IngredientType;
  }

  /** A row returned after inserting an ingredient. */
  interface SavedIngredient {
    id: string;
    name: string;
    ingredient_type: IngredientType;
    slug: string;
  }

  /** A saved recipe row with its ingredient count, for the browse view. */
  interface ParsedRecipeRow {
    id: string;
    url: string;
    title: string | null;
    created_at: string;
    ingredient_count: number;
  }
}
