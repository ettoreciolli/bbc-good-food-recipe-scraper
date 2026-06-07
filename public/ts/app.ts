(function () {
  "use strict";
  var app = angular.module("app", ["ngRoute"]);
  app.config([
    "$routeProvider",
    function ($routeProvider: any) {
      $routeProvider
        .when("/", {
          templateUrl: "partials/home.html",
          controller: "homeController",
        })
        .when("/ingredients", {
          templateUrl: "partials/ingredients.html",
          controller: "ingredientsController",
        })
        .when("/browse", {
          templateUrl: "partials/browse.html",
          controller: "browseController",
        })
        .when("/about", {
          template: "<h1>About</h1>",
        })
        .otherwise({
          redirectTo: "/",
        });
    },
  ]);
})();
