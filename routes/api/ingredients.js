var express = require("express");
var addIngredients = require("../../db/ingredients").addIngredients;
var router = express();

var VALID_TYPES = { liquid: true, solid: true };

router.all("/", function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
  next();
});

/**
 * Save one or more new ingredients to the ingredient table.
 * Expects a JSON body of the form:
 *   { ingredients: [{ name: string, type: "liquid" | "solid" }, ...] }
 */
router.post("/", function (req, res) {
  var ingredients = (req.body && req.body.ingredients) || [];

  var cleaned = [];
  for (var i = 0; i < ingredients.length; i++) {
    var name = (ingredients[i].name || "").trim();
    var type = ingredients[i].type;

    if (!name) {
      continue; // skip blank rows
    }
    if (!VALID_TYPES[type]) {
      return res
        .status(400)
        .send({ error: "Ingredient type must be 'liquid' or 'solid'" });
    }
    cleaned.push({ name: name, type: type });
  }

  if (!cleaned.length) {
    return res.status(400).send({ error: "No ingredients to save" });
  }

  addIngredients(cleaned)
    .then(function (saved) {
      res.send({ saved: saved });
    })
    .catch(function (err) {
      console.error("Failed to save ingredients:", err);
      res.status(500).send({ error: "Failed to save ingredients" });
    });
});

module.exports = router;
