(function () {
  "use strict";

  /**
   * Turn a scraped recipe into a per-line / per-segment display model.
   *
   * Each ingredient line is already split into "and" segments by the matcher.
   * For every segment we find its match (if any) in ingredientsParsed and slice
   * the segment text into before / matched / after runs using the match's
   * letterIndex and phraseLength, so the template can underline just the matched
   * words. Segments with no match are flagged so a red "!" can be shown.
   */
  function buildIngredientDisplay(
    recipe: App.Recipe
  ): App.IngredientDisplayLine[] {
    var parsed = recipe.ingredientsParsed || [];

    return (recipe.ingredientLines || []).map(function (
      line,
      index
    ): App.IngredientDisplayLine {
      var segments =
        line.segments && line.segments.length ? line.segments : [line.text];

      var displaySegments = segments.map(function (
        segmentText,
        segmentIndex
      ): App.IngredientDisplaySegment {
        var match: App.ParsedIngredient | null = null;
        for (var i = 0; i < parsed.length; i++) {
          if (
            parsed[i].index === index &&
            parsed[i].segmentIndex === segmentIndex
          ) {
            match = parsed[i];
            break;
          }
        }

        if (!match) {
          return {
            parts: [{ text: segmentText, matched: false }],
            matched: false,
          };
        }

        var start = Math.max(0, match.letterIndex);
        var end = Math.min(segmentText.length, start + match.phraseLength);
        var parts: App.IngredientPart[] = [];
        var before = segmentText.substring(0, start);
        var mid = segmentText.substring(start, end);
        var after = segmentText.substring(end);
        if (before) {
          parts.push({ text: before, matched: false });
        }
        parts.push({ text: mid || segmentText, matched: true, id: match.id });
        if (after) {
          parts.push({ text: after, matched: false });
        }
        return { parts: parts, matched: true };
      });

      return { index: index, segments: displaySegments };
    });
  }

  angular.module("app").controller("homeController", [
    "$scope",
    "$http",
    "$location",
    "recipeStore",
    function (
      $scope: App.HomeScope,
      $http: angular.IHttpService,
      $location: angular.ILocationService,
      recipeStore: App.RecipeStore
    ) {
      // Restore a previously scraped recipe (e.g. after visiting the
      // ingredients tab and coming back) from the shared store.
      var existing = recipeStore.getRecipe();
      if (existing) {
        $scope.json = existing;
        $scope.ingredientDisplay = buildIngredientDisplay(existing);
      }

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
          $scope.ingredientDisplay = buildIngredientDisplay(data);
          recipeStore.setRecipe(data);
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

      // Clicking a recognised (underlined) ingredient jumps to the ingredients
      // tab with that ingredient pinned to the top of the list.
      $scope.openIngredient = function (part: App.IngredientPart) {
        if (!part.matched || !part.id) {
          return;
        }
        $location.path("/ingredients").search({ ingredient: part.id });
      };
    },
  ]);
})();
