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
    /** Stash a url for the home view to scrape (used by the browse view). */
    setPendingUrl(url: string | null): void;
    /** Return and clear the pending url, if any. */
    takePendingUrl(): string | null;
  }

  /** Scope used by the browse (saved recipes) controller. */
  interface BrowseScope extends angular.IScope {
    recipes: ParsedRecipeRow[];
    loading: boolean;
    loadError: string | null;
    loadRecipes(): void;
    loadRecipe(recipe: ParsedRecipeRow): void;
  }

  // --- Recipe ingredient display model -------------------------------------
  // Precomputed so the template can underline matched words and flag unmatched
  // segments without calling functions inside ng-repeat (which would re-run
  // every digest).

  /** A run of text within a segment, flagged when it's a matched ingredient. */
  interface IngredientPart {
    text: string;
    matched: boolean;
    /** DB id of the matched ingredient (present when matched). */
    id?: string;
  }

  /** One "and"-split segment of an ingredient line. */
  interface IngredientDisplaySegment {
    parts: IngredientPart[];
    /** True when some ingredient was matched within this segment. */
    matched: boolean;
    /** Amount/unit parse error for this segment, if any. */
    error?: string | null;
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
    /** Open the ingredients tab focused on a matched ingredient. */
    openIngredient(part: IngredientPart): void;

    // Saving the settled recipe to the database.
    /** True when every line is matched and free of amount/unit errors. */
    canSave: boolean;
    saving: boolean;
    saveError: string | null;
    saveMessage: string | null;
    saveRecipe(): void;
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
    /** Free-text filter for the database ingredient list. */
    dbSearch?: string;
    /** Id of the ingredient to pin to the top / highlight, if any. */
    highlightId: string | null;
    loadError: string | null;
    loading: boolean;
    loadDb(): void;
    removeDbIngredient(ing: IngredientRow): void;

    // Inline editing of a saved ingredient.
    editId: string | null;
    editName: string;
    editType: IngredientType;
    editError: string | null;
    editSaving: boolean;
    beginEdit(ing: IngredientRow): void;
    cancelEdit(): void;
    saveEdit(): void;

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
