(function () {
  "use strict";
  // Singleton state shared across views (see App.RecipeStore). A plain factory
  // is AngularJS's idiomatic place for state that must outlive a single view's
  // $scope, which ngRoute tears down on every navigation.
  angular.module("app").factory("recipeStore", function (): App.RecipeStore {
    var recipe: App.Recipe | null = null;
    var pendingUrl: string | null = null;
    return {
      getRecipe: function (): App.Recipe | null {
        return recipe;
      },
      setRecipe: function (next: App.Recipe | null): void {
        recipe = next;
      },
      setPendingUrl: function (url: string | null): void {
        pendingUrl = url;
      },
      // Return the pending url (set by the browse view) and clear it, so the
      // home view scrapes it once rather than on every visit.
      takePendingUrl: function (): string | null {
        var url = pendingUrl;
        pendingUrl = null;
        return url;
      },
    };
  });
})();
