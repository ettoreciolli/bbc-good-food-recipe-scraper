(function () {
  "use strict";
  angular.module("app").directive("recipeForm", function (): angular.IDirective {
    return {
      restrict: "E",
      templateUrl: "partials/directives/recipe-form.html",
    };
  });
})();
