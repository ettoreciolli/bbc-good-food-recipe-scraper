(function () {
  "use strict";

  /** Split a free-text name into several on "and", "&" or commas. */
  function splitName(name: string): string[] {
    return String(name == null ? "" : name)
      .split(/\s+and\s+|&|,/i)
      .map(function (part) {
        return part.trim();
      })
      .filter(Boolean);
  }

  /** Collect the segments of a recipe that matched no known ingredient. */
  function notFoundSegments(recipe: App.Recipe | null): string[] {
    if (!recipe) {
      return [];
    }
    var parsed = recipe.ingredientsParsed || [];
    var result: string[] = [];
    (recipe.ingredientLines || []).forEach(function (line, index) {
      var segments =
        line.segments && line.segments.length ? line.segments : [line.text];
      segments.forEach(function (segment, segmentIndex) {
        var found = false;
        for (var i = 0; i < parsed.length; i++) {
          if (
            parsed[i].index === index &&
            parsed[i].segmentIndex === segmentIndex
          ) {
            found = true;
            break;
          }
        }
        if (!found && segment.trim()) {
          result.push(segment.trim());
        }
      });
    });
    return result;
  }

  angular.module("app").controller("ingredientsController", [
    "$scope",
    "$http",
    "$routeParams",
    "recipeStore",
    function (
      $scope: App.IngredientsScope,
      $http: angular.IHttpService,
      $routeParams: { ingredient?: string },
      recipeStore: App.RecipeStore
    ) {
      $scope.recipe = recipeStore.getRecipe();
      $scope.notFoundSegments = notFoundSegments($scope.recipe);

      // When arrived at via a click on a recognised ingredient, this is its id.
      var focusId: string | null = $routeParams.ingredient || null;

      // --- Add new ingredients ------------------------------------------
      $scope.addError = null;
      $scope.saving = false;

      function emptyRow(): App.IngredientFormRow {
        return { name: "", type: "solid" };
      }

      // Pre-fill the form with the recipe's unrecognised segments, falling
      // back to a single blank row when there's nothing to suggest.
      $scope.newRows = $scope.notFoundSegments.length
        ? $scope.notFoundSegments.map(function (
            name
          ): App.IngredientFormRow {
            return { name: name, type: "solid" };
          })
        : [emptyRow()];

      $scope.addRow = function () {
        $scope.newRows.push(emptyRow());
      };

      $scope.removeRow = function (index: number) {
        $scope.newRows.splice(index, 1);
        if (!$scope.newRows.length) {
          $scope.newRows.push(emptyRow());
        }
      };

      // Split one row's name into several rows (e.g. "salt and pepper").
      $scope.splitRow = function (index: number) {
        var row = $scope.newRows[index];
        var names = splitName(row.name);
        if (names.length <= 1) {
          return;
        }
        var replacement = names.map(function (name): App.IngredientFormRow {
          return { name: name, type: row.type };
        });
        $scope.newRows = $scope.newRows
          .slice(0, index)
          .concat(replacement, $scope.newRows.slice(index + 1));
      };

      $scope.fillFromRecipe = function () {
        if (!$scope.notFoundSegments.length) {
          return;
        }
        $scope.newRows = $scope.notFoundSegments.map(function (
          name
        ): App.IngredientFormRow {
          return { name: name, type: "solid" };
        });
      };

      $scope.saveNew = function () {
        var toSave = $scope.newRows.filter(function (row) {
          return row.name && row.name.trim();
        });
        if (!toSave.length) {
          $scope.addError = "Please enter at least one ingredient name.";
          return;
        }

        $scope.saving = true;
        $scope.addError = null;

        var body: App.AddIngredientsBody = {
          ingredients: toSave.map(function (row): App.NewIngredient {
            return { name: row.name.trim(), type: row.type };
          }),
        };

        $http.post("/api/ingredients", body).then(
          function (response) {
            $scope.saving = false;
            var data = response.data as App.AddIngredientsResponse &
              App.ErrorResponse;
            if (data.error) {
              $scope.addError = data.error;
              return;
            }
            $scope.newRows = [emptyRow()];
            $scope.loadDb();
          },
          function () {
            $scope.saving = false;
            $scope.addError = "Something went wrong saving the ingredients.";
          }
        );
      };

      // --- Existing ingredients from the database -----------------------
      $scope.dbIngredients = [];
      $scope.highlightId = focusId;
      $scope.loadError = null;
      $scope.loading = false;

      // Move the focused ingredient (if any) to the top of the list.
      function pinFocused(ingredients: App.IngredientRow[]): App.IngredientRow[] {
        if (!focusId) {
          return ingredients;
        }
        var focused = ingredients.filter(function (ing) {
          return ing.id === focusId;
        });
        if (!focused.length) {
          return ingredients;
        }
        var rest = ingredients.filter(function (ing) {
          return ing.id !== focusId;
        });
        return focused.concat(rest);
      }

      $scope.loadDb = function () {
        $scope.loading = true;
        $scope.loadError = null;
        $http.get("/api/ingredients").then(
          function (response) {
            $scope.loading = false;
            var data = response.data as App.ListIngredientsResponse &
              App.ErrorResponse;
            if (data.error) {
              $scope.loadError = data.error;
              return;
            }
            $scope.dbIngredients = pinFocused(data.ingredients || []);
          },
          function () {
            $scope.loading = false;
            $scope.loadError = "Could not load ingredients from the database.";
          }
        );
      };

      $scope.removeDbIngredient = function (ing: App.IngredientRow) {
        $http.delete("/api/ingredients/" + encodeURIComponent(ing.id)).then(
          function () {
            $scope.dbIngredients = $scope.dbIngredients.filter(function (row) {
              return row.id !== ing.id;
            });
          },
          function () {
            $scope.loadError = "Could not delete that ingredient.";
          }
        );
      };

      // --- Edit a saved ingredient inline ------------------------------
      $scope.editId = null;
      $scope.editName = "";
      $scope.editType = "solid";
      $scope.editError = null;
      $scope.editSaving = false;

      $scope.beginEdit = function (ing: App.IngredientRow) {
        $scope.editId = ing.id;
        $scope.editName = ing.name;
        $scope.editType = ing.ingredient_type;
        $scope.editError = null;
      };

      $scope.cancelEdit = function () {
        $scope.editId = null;
        $scope.editError = null;
      };

      $scope.saveEdit = function () {
        var id = $scope.editId;
        if (!id) {
          return;
        }
        var name = ($scope.editName || "").trim();
        if (!name) {
          $scope.editError = "Please enter an ingredient name.";
          return;
        }

        $scope.editSaving = true;
        $scope.editError = null;

        var body: App.UpdateIngredientBody = { name: name, type: $scope.editType };

        $http.put("/api/ingredients/" + encodeURIComponent(id), body).then(
          function (response) {
            $scope.editSaving = false;
            var data = response.data as App.UpdateIngredientResponse &
              App.ErrorResponse;
            if (data.error) {
              $scope.editError = data.error;
              return;
            }
            // Reflect the change in the loaded list without a full reload.
            $scope.dbIngredients = $scope.dbIngredients.map(function (row) {
              return row.id === data.updated.id
                ? {
                    id: data.updated.id,
                    name: data.updated.name,
                    ingredient_type: data.updated.ingredient_type,
                  }
                : row;
            });
            $scope.editId = null;
          },
          function () {
            $scope.editSaving = false;
            $scope.editError = "Something went wrong updating the ingredient.";
          }
        );
      };

      // --- Split a saved ingredient into several ------------------------
      $scope.splitTarget = null;
      $scope.splitRows = [];
      $scope.splitError = null;
      $scope.splitting = false;

      $scope.beginSplit = function (ing: App.IngredientRow) {
        $scope.splitTarget = ing;
        $scope.splitError = null;
        var names = splitName(ing.name);
        $scope.splitRows = (names.length ? names : [ing.name]).map(function (
          name
        ): App.IngredientFormRow {
          return { name: name, type: ing.ingredient_type };
        });
        // Always offer at least two rows so it's clearly a split.
        if ($scope.splitRows.length < 2) {
          $scope.splitRows.push({ name: "", type: ing.ingredient_type });
        }
      };

      $scope.addSplitRow = function () {
        var type: App.IngredientType = $scope.splitTarget
          ? $scope.splitTarget.ingredient_type
          : "solid";
        $scope.splitRows.push({ name: "", type: type });
      };

      $scope.removeSplitRow = function (index: number) {
        $scope.splitRows.splice(index, 1);
      };

      $scope.cancelSplit = function () {
        $scope.splitTarget = null;
        $scope.splitRows = [];
        $scope.splitError = null;
      };

      $scope.confirmSplit = function () {
        const target = $scope.splitTarget;
        if (!target) {
          return;
        }
        var rows = $scope.splitRows.filter(function (row) {
          return row.name && row.name.trim();
        });
        if (rows.length < 2) {
          $scope.splitError = "Enter at least two ingredients to split into.";
          return;
        }

        $scope.splitting = true;
        $scope.splitError = null;

        var body: App.AddIngredientsBody = {
          ingredients: rows.map(function (row): App.NewIngredient {
            return { name: row.name.trim(), type: row.type };
          }),
        };

        // Add the replacements first, then remove the original, so a failure
        // never loses the ingredient (at worst it leaves a duplicate).
        $http.post("/api/ingredients", body).then(
          function (response) {
            var data = response.data as App.AddIngredientsResponse &
              App.ErrorResponse;
            if (data.error) {
              $scope.splitting = false;
              $scope.splitError = data.error;
              return;
            }
            $http
              .delete("/api/ingredients/" + encodeURIComponent(target.id))
              .then(
                function () {
                  $scope.splitting = false;
                  $scope.cancelSplit();
                  $scope.loadDb();
                },
                function () {
                  $scope.splitting = false;
                  $scope.splitError =
                    "Added the new ingredients but couldn't remove the original.";
                  $scope.loadDb();
                }
              );
          },
          function () {
            $scope.splitting = false;
            $scope.splitError = "Something went wrong splitting the ingredient.";
          }
        );
      };

      // Initial load.
      $scope.loadDb();
    },
  ]);
})();
