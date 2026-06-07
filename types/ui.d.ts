// Types for the AngularJS frontend (public/ts).

declare namespace App {
  /**
   * Shared singleton state. ngRoute destroys a view's $scope when you switch
   * tabs, so the scraped recipe is kept here instead so both the home view and
   * the ingredients view can read it.
   */
  interface RecipeStore {
    getRecipe(): Recipe | null;
    setRecipe(recipe: Recipe | null): void;
  }

  // --- Recipe ingredient display model -------------------------------------
  // Precomputed so the template can underline matched words and flag unmatched
  // segments without calling functions inside ng-repeat (which would re-run
  // every digest).

  /** A run of text within a segment, flagged when it's a matched ingredient. */
  interface IngredientPart {
    text: string;
    matched: boolean;
  }

  /** One "and"-split segment of an ingredient line. */
  interface IngredientDisplaySegment {
    parts: IngredientPart[];
    /** True when some ingredient was matched within this segment. */
    matched: boolean;
  }

  /** A whole ingredient line, broken into segments for display. */
  interface IngredientDisplayLine {
    index: number;
    segments: IngredientDisplaySegment[];
  }

  // --- Ingredients tab ------------------------------------------------------

  /** A row in the "add ingredients" form on the ingredients tab. */
  interface IngredientFormRow {
    name: string;
    type: IngredientType;
  }

  /** Scope used by the home (scrape) controller. */
  interface HomeScope extends angular.IScope {
    recipe?: { url: string };
    json?: Recipe;
    error?: string | null;
    ingredientDisplay?: IngredientDisplayLine[];

    getRecipe(): void;
    closeError(): void;
  }

  /** Scope used by the ingredients (manage) controller. */
  interface IngredientsScope extends angular.IScope {
    recipe: Recipe | null;
    /** Unmatched segment texts pulled from the current recipe. */
    notFoundSegments: string[];

    // Add-new form.
    newRows: IngredientFormRow[];
    addError: string | null;
    saving: boolean;
    addRow(): void;
    removeRow(index: number): void;
    splitRow(index: number): void;
    fillFromRecipe(): void;
    saveNew(): void;

    // Existing ingredients from the database.
    dbIngredients: IngredientRow[];
    loadError: string | null;
    loading: boolean;
    loadDb(): void;
    removeDbIngredient(ing: IngredientRow): void;

    // Splitting a saved ingredient into several.
    splitTarget: IngredientRow | null;
    splitRows: IngredientFormRow[];
    splitError: string | null;
    splitting: boolean;
    beginSplit(ing: IngredientRow): void;
    addSplitRow(): void;
    removeSplitRow(index: number): void;
    cancelSplit(): void;
    confirmSplit(): void;
  }
}
