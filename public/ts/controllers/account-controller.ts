(function () {
  "use strict";

  angular.module("app").controller("accountController", [
    "$scope",
    "$http",
    "$location",
    "authService",
    "recipeStore",
    function (
      $scope: App.AccountScope,
      $http: angular.IHttpService,
      $location: angular.ILocationService,
      authService: App.AuthService,
      recipeStore: App.RecipeStore
    ) {
      $scope.auth = authService;
      $scope.signinForm = { email: "", password: "" };
      $scope.signupForm = { name: "", email: "", password: "" };
      $scope.authError = null;
      $scope.authBusy = false;

      $scope.favorites = [];
      $scope.favError = null;
      $scope.inventory = [];
      $scope.invError = null;
      $scope.dbIngredients = [];
      $scope.newInv = { ingredient_id: "", quantity: "", unit: "" };

      // --- Auth -----------------------------------------------------------
      function afterAuth(user: App.AuthUser | null) {
        $scope.authBusy = false;
        if (user) {
          $scope.authError = null;
          refresh();
        }
      }

      $scope.signIn = function () {
        $scope.authBusy = true;
        $scope.authError = null;
        authService
          .signIn($scope.signinForm.email, $scope.signinForm.password)
          .then(afterAuth, function () {
            $scope.authBusy = false;
            $scope.authError = "Couldn't sign in — check your details.";
          });
      };

      $scope.signUp = function () {
        $scope.authBusy = true;
        $scope.authError = null;
        authService
          .signUp(
            $scope.signupForm.name,
            $scope.signupForm.email,
            $scope.signupForm.password
          )
          .then(afterAuth, function () {
            $scope.authBusy = false;
            $scope.authError = "Couldn't create the account.";
          });
      };

      $scope.signOut = function () {
        authService.signOut().then(function () {
          $scope.favorites = [];
          $scope.inventory = [];
        });
      };

      // --- Favorites ------------------------------------------------------
      function loadFavorites() {
        $scope.favError = null;
        $http.get("/api/favorites").then(
          function (response) {
            var data = response.data as App.FavoritesResponse &
              App.ErrorResponse;
            if (data.error) {
              $scope.favError = data.error;
              return;
            }
            $scope.favorites = data.favorites || [];
          },
          function () {
            $scope.favError = "Couldn't load your favorites.";
          }
        );
      }

      $scope.loadFavorite = function (fav: App.FavoriteRecipeRow) {
        recipeStore.setPendingUrl(fav.url);
        $location.path("/").search({});
      };

      $scope.removeFavorite = function (fav: App.FavoriteRecipeRow) {
        $http
          .delete("/api/favorites/" + encodeURIComponent(fav.recipe_id))
          .then(
            function () {
              $scope.favorites = $scope.favorites.filter(function (f) {
                return f.recipe_id !== fav.recipe_id;
              });
            },
            function () {
              $scope.favError = "Couldn't remove that favorite.";
            }
          );
      };

      // --- Inventory ------------------------------------------------------
      function loadInventory() {
        $scope.invError = null;
        $http.get("/api/inventory").then(
          function (response) {
            var data = response.data as App.InventoryResponse &
              App.ErrorResponse;
            if (data.error) {
              $scope.invError = data.error;
              return;
            }
            $scope.inventory = data.items || [];
          },
          function () {
            $scope.invError = "Couldn't load your inventory.";
          }
        );
      }

      function loadDbIngredients() {
        $http.get("/api/ingredients").then(function (response) {
          var data = response.data as App.ListIngredientsResponse &
            App.ErrorResponse;
          if (!data.error) {
            $scope.dbIngredients = data.ingredients || [];
          }
        });
      }

      $scope.addInventory = function () {
        if (!$scope.newInv.ingredient_id) {
          $scope.invError = "Pick an ingredient first.";
          return;
        }
        var body: App.SetInventoryBody = {
          ingredient_id: $scope.newInv.ingredient_id,
          quantity: $scope.newInv.quantity || null,
          unit: $scope.newInv.unit || null,
        };
        $http.post("/api/inventory", body).then(
          function (response) {
            var data = response.data as App.ErrorResponse;
            if (data.error) {
              $scope.invError = data.error;
              return;
            }
            $scope.newInv = { ingredient_id: "", quantity: "", unit: "" };
            $scope.invError = null;
            loadInventory();
          },
          function (response) {
            var data = (response && response.data) as App.ErrorResponse;
            $scope.invError =
              (data && data.error) || "Couldn't save that item.";
          }
        );
      };

      $scope.removeInventory = function (item: App.InventoryItemRow) {
        $http
          .delete("/api/inventory/" + encodeURIComponent(item.ingredient_id))
          .then(
            function () {
              $scope.inventory = $scope.inventory.filter(function (i) {
                return i.ingredient_id !== item.ingredient_id;
              });
            },
            function () {
              $scope.invError = "Couldn't remove that item.";
            }
          );
      };

      function refresh() {
        loadFavorites();
        loadInventory();
        loadDbIngredients();
      }

      // On entry, make sure we know who (if anyone) is signed in.
      authService.loadSession().then(function (user) {
        if (user) {
          refresh();
        }
      });
    },
  ]);
})();
