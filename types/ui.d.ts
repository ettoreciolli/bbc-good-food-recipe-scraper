// Types for the AngularJS frontend (public/ts).

declare namespace App {
  /** A row in the "add missing ingredients" modal. */
  interface NewIngredientRow {
    index: number;
    name: string;
    type: IngredientType;
  }

  /** Scope used by the home controller. */
  interface HomeScope extends angular.IScope {
    recipe?: { url: string };
    json?: Recipe;
    error?: string | null;

    getRecipe(): void;
    closeError(): void;
    isIngredientFound(index: number): boolean;

    // "Add missing ingredients" modal state.
    showIngredientModal: boolean;
    savingIngredients: boolean;
    ingredientModalError: string | null;
    newIngredients?: NewIngredientRow[];
    openIngredientModal(): void;
    closeIngredientModal(): void;
    saveIngredients(): void;
  }
}
