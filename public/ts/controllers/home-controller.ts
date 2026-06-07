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
        return {
          parts: parts,
          matched: true,
          error: match.parseError || null,
        };
      });

      return { index: index, segments: displaySegments };
    });
  }

  /**
   * A recipe is "settled" (and so saveable) once every line matched a known
   * ingredient and none of the matches have an amount/unit parse error.
   */
  function isSettled(recipe: App.Recipe): boolean {
    if (recipe.notFoundIngredients && recipe.notFoundIngredients.length) {
      return false;
    }
    var parsed = recipe.ingredientsParsed || [];
    for (var i = 0; i < parsed.length; i++) {
      if (parsed[i].parseError) {
        return false;
      }
    }
    return true;
  }

  angular.module("app").controller("homeController", [
    "$scope",
    "$http",
    "$location",
    "recipeStore",
    "authService",
    function (
      $scope: App.HomeScope,
      $http: angular.IHttpService,
      $location: angular.ILocationService,
      recipeStore: App.RecipeStore,
      authService: App.AuthService
    ) {
      // Expose auth so the view can show the favorite button when signed in.
      $scope.auth = authService;
      authService.loadSession();
      $scope.favoriting = false;
      $scope.favError = null;
      $scope.favMessage = null;
      $scope.ingredientView = "lines";
      $scope.canSave = false;
      $scope.saving = false;
      $scope.saveError = null;
      $scope.saveMessage = null;

      // Show a recipe: build its display model and work out whether it's
      // settled enough to save.
      function applyRecipe(data: App.Recipe) {
        $scope.json = data;
        $scope.ingredientDisplay = buildIngredientDisplay(data);
        $scope.canSave = isSettled(data);
        $scope.saveError = null;
        $scope.saveMessage = null;
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

          applyRecipe(data);
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

      // A url handed over from the browse view takes priority: scrape it.
      // Otherwise restore a previously scraped recipe (e.g. after visiting the
      // ingredients tab and coming back) from the shared store.
      var pendingUrl = recipeStore.takePendingUrl();
      if (pendingUrl) {
        $scope.recipe = { url: pendingUrl };
        $scope.getRecipe();
      } else {
        var existing = recipeStore.getRecipe();
        if (existing) {
          applyRecipe(existing);
        }
      }

      // Favorite the current recipe (auto-saves it by url server-side).
      $scope.favoriteRecipe = function () {
        var json = $scope.json;
        if (!json || !authService.user) {
          return;
        }
        $scope.favoriting = true;
        $scope.favError = null;
        $scope.favMessage = null;
        $http
          .post("/api/favorites", { url: json.self_url, title: json.title })
          .then(
            function (response) {
              $scope.favoriting = false;
              var data = response.data as App.ErrorResponse;
              if (data.error) {
                $scope.favError = data.error;
                return;
              }
              $scope.favMessage = "Added to your favorites.";
            },
            function () {
              $scope.favoriting = false;
              $scope.favError = "Couldn't favorite this recipe.";
            }
          );
      };

      // Clicking a recognised (underlined) ingredient jumps to the ingredients
      // tab with that ingredient pinned to the top of the list.
      $scope.openIngredient = function (part: App.IngredientPart) {
        if (!part.matched || !part.id) {
          return;
        }
        $location.path("/ingredients").search({ ingredient: part.id });
      };

      // Persist the settled recipe and its parsed ingredient rows.
      $scope.saveRecipe = function () {
        var json = $scope.json;
        if (!json || !$scope.canSave) {
          return;
        }

        $scope.saving = true;
        $scope.saveError = null;
        $scope.saveMessage = null;

        var body: App.SaveRecipeBody = {
          url: json.self_url,
          title: json.title,
          ingredients: (json.ingredientsParsed || []).map(function (
            parsed
          ): App.SaveRecipeIngredient {
            return {
              ingredient_id: parsed.id,
              line_index: parsed.index,
              segment_index: parsed.segmentIndex,
              unit: parsed.unit != null ? parsed.unit : null,
              quantity: parsed.amount != null ? parsed.amount : null,
            };
          }),
        };

        $http.post("/api/recipes", body).then(
          function (response) {
            $scope.saving = false;
            var data = response.data as App.SaveRecipeResponse &
              App.ErrorResponse;
            if (data.error) {
              $scope.saveError = data.error;
              return;
            }
            $scope.saveMessage =
              "Saved " +
              data.saved +
              " ingredient" +
              (data.saved === 1 ? "" : "s") +
              " for this recipe.";
          },
          function () {
            $scope.saving = false;
            $scope.saveError = "Something went wrong saving the recipe.";
          }
        );
      };
    },
  ]);
})();
