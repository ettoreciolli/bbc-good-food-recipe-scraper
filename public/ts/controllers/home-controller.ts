(function () {
  "use strict";
  angular.module("app").controller("homeController", [
    "$scope",
    "$http",
    "$timeout",
    function (
      $scope: App.HomeScope,
      $http: angular.IHttpService,
      $timeout: angular.ITimeoutService
    ) {
      $scope.getRecipe = function () {
        if (!$scope.recipe) {
          console.log("no input");
          return;
        }

        var url = "/api/scrape?url=" + $scope.recipe.url;

        $http.get(url).then(function (response) {
          var data = response.data as App.Recipe & App.ErrorResponse;

          if (data.error) {
            $scope.error = data.error;
            return;
          }

          $scope.json = data;
          if ($scope.recipe) {
            $scope.recipe.url = "";
          }
        });
      };

      $scope.closeError = function () {
        $scope.error = null;
        if ($scope.recipe) {
          $scope.recipe.url = "";
        }
      };

      // An ingredient line is considered "found" when its index is not in
      // notFoundIngredients. Defaults to found when matching data is absent.
      $scope.isIngredientFound = function (index: number): boolean {
        return (
          !$scope.json ||
          !$scope.json.notFoundIngredients ||
          $scope.json.notFoundIngredients.indexOf(index) === -1
        );
      };

      // --- Add missing ingredients modal --------------------------------

      $scope.showIngredientModal = false;
      $scope.savingIngredients = false;
      $scope.ingredientModalError = null;

      // Open the modal, pre-filling a row per not-found line with the line
      // text as a starting name and a default type of "solid".
      $scope.openIngredientModal = function () {
        var json = $scope.json;
        if (!json || !json.notFoundIngredients) {
          return;
        }
        $scope.ingredientModalError = null;
        $scope.newIngredients = json.notFoundIngredients.map(function (
          index: number
        ): App.NewIngredientRow {
          return {
            index: index,
            name: json!.ingredientLines[index].text,
            type: "solid",
          };
        });
        $scope.showIngredientModal = true;
      };

      $scope.closeIngredientModal = function () {
        $scope.showIngredientModal = false;
        $scope.ingredientModalError = null;
      };

      // Save the entered ingredients to the database. On success the saved
      // lines are removed from notFoundIngredients so their markers flip to
      // the "found" tick.
      $scope.saveIngredients = function () {
        var toSave = ($scope.newIngredients || []).filter(function (ing) {
          return ing.name && ing.name.trim();
        });

        if (!toSave.length) {
          $scope.ingredientModalError =
            "Please enter at least one ingredient name.";
          return;
        }

        $scope.savingIngredients = true;
        $scope.ingredientModalError = null;

        var body: App.AddIngredientsBody = {
          ingredients: toSave.map(function (ing): App.NewIngredient {
            return { name: ing.name.trim(), type: ing.type };
          }),
        };

        $http.post("/api/ingredients", body).then(
          function (response) {
            $scope.savingIngredients = false;

            var data = response.data as App.AddIngredientsResponse &
              App.ErrorResponse;
            if (data.error) {
              $scope.ingredientModalError = data.error;
              return;
            }

            // Flip the saved lines to "found".
            var savedIndexes = toSave.map(function (ing) {
              return ing.index;
            });
            if ($scope.json) {
              $scope.json.notFoundIngredients = $scope.json.notFoundIngredients.filter(
                function (index) {
                  return savedIndexes.indexOf(index) === -1;
                }
              );
            }

            $scope.closeIngredientModal();
          },
          function () {
            $scope.savingIngredients = false;
            $scope.ingredientModalError =
              "Something went wrong saving the ingredients.";
          }
        );
      };
    },
  ]);
})();
