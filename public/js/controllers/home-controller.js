(function () {
	'use strict';
	angular.module('app')
	  .controller('homeController', ['$scope', '$http', '$timeout', function ($scope, $http, $timeout) {
	  	$scope.getRecipe = function () {
				if ($scope.recipe) {

		  		var url = '/api/scrape?url=' + $scope.recipe.url;

		  		$http.get(url).then(function (response, error) {

		  			if (response.data.error) {
		  				return $scope.error = response.data.error;
		  			}

		  			$scope.json = response.data;
						$scope.recipe.url = "";

		  		});

				} else {

					return console.log('no input');

				}
	  	};

			$scope.closeError = function () {
				$scope.error = null;
				$scope.recipe.url = "";
			};

			// An ingredient line is considered "found" when its index is not in
			// notFoundIngredients. Defaults to found when matching data is absent.
			$scope.isIngredientFound = function (index) {
				return !$scope.json ||
					!$scope.json.notFoundIngredients ||
					$scope.json.notFoundIngredients.indexOf(index) === -1;
			};

			// --- Add missing ingredients modal --------------------------------

			$scope.showIngredientModal = false;
			$scope.savingIngredients = false;
			$scope.ingredientModalError = null;

			// Open the modal, pre-filling a row per not-found line with the line
			// text as a starting name and a default type of "solid".
			$scope.openIngredientModal = function () {
				if (!$scope.json || !$scope.json.notFoundIngredients) {
					return;
				}
				$scope.ingredientModalError = null;
				$scope.newIngredients = $scope.json.notFoundIngredients.map(function (index) {
					return {
						index: index,
						name: $scope.json.ingredients[index],
						type: 'solid'
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
					$scope.ingredientModalError = "Please enter at least one ingredient name.";
					return;
				}

				$scope.savingIngredients = true;
				$scope.ingredientModalError = null;

				$http.post('/api/ingredients', {
					ingredients: toSave.map(function (ing) {
						return { name: ing.name.trim(), type: ing.type };
					})
				}).then(function (response) {
					$scope.savingIngredients = false;

					if (response.data.error) {
						$scope.ingredientModalError = response.data.error;
						return;
					}

					// Flip the saved lines to "found".
					var savedIndexes = toSave.map(function (ing) { return ing.index; });
					$scope.json.notFoundIngredients = $scope.json.notFoundIngredients.filter(function (index) {
						return savedIndexes.indexOf(index) === -1;
					});

					$scope.closeIngredientModal();
				}, function () {
					$scope.savingIngredients = false;
					$scope.ingredientModalError = "Something went wrong saving the ingredients.";
				});
			};

	  }]);
})();
