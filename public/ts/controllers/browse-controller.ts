(function () {
  "use strict";

  angular.module("app").controller("browseController", [
    "$scope",
    "$http",
    "$location",
    "recipeStore",
    function (
      $scope: App.BrowseScope,
      $http: angular.IHttpService,
      $location: angular.ILocationService,
      recipeStore: App.RecipeStore
    ) {
      $scope.recipes = [];
      $scope.loading = false;
      $scope.loadError = null;

      $scope.loadRecipes = function () {
        $scope.loading = true;
        $scope.loadError = null;
        $http.get("/api/recipes").then(
          function (response) {
            $scope.loading = false;
            var data = response.data as App.ListRecipesResponse &
              App.ErrorResponse;
            if (data.error) {
              $scope.loadError = data.error;
              return;
            }
            $scope.recipes = data.recipes || [];
          },
          function () {
            $scope.loading = false;
            $scope.loadError = "Could not load saved recipes.";
          }
        );
      };

      // Hand the recipe's url to the home view and switch to it, where it gets
      // re-scraped (re-fetching method/image and re-matching ingredients).
      $scope.loadRecipe = function (recipe: App.ParsedRecipeRow) {
        recipeStore.setPendingUrl(recipe.url);
        $location.path("/").search({});
      };

      $scope.loadRecipes();
    },
  ]);
})();
