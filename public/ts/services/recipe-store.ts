(function () {
  "use strict";
  // Singleton state shared across views (see App.RecipeStore). A plain factory
  // is AngularJS's idiomatic place for state that must outlive a single view's
  // $scope, which ngRoute tears down on every navigation.
  angular.module("app").factory("recipeStore", function (): App.RecipeStore {
    var recipe: App.Recipe | null = null;
    return {
      getRecipe: function (): App.Recipe | null {
        return recipe;
      },
      setRecipe: function (next: App.Recipe | null): void {
        recipe = next;
      },
    };
  });
})();
