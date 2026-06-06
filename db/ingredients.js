var pool = require("./index");

/**
 * Fetch every row from the ingredient table.
 *
 * @returns {Promise<Array<{ id: string, name: string, type: string }>>}
 *   Resolves with the list of ingredients (id is a uuid, type is the
 *   liquid/solid enum).
 */
function getIngredients() {
  return pool
    .query("SELECT id, name, ingredient_type FROM ingredient")
    .then(function (result) {
      return result.rows;
    });
}

/**
 * Insert new ingredients into the ingredient table.
 *
 * @param {Array<{ name: string, type: string }>} ingredients - ingredients to
 *   save (type must be the 'liquid' or 'solid' enum). The uuid id is generated
 *   by the database.
 * @returns {Promise<Array<{ id: string, name: string, type: string }>>}
 *   Resolves with the saved rows, including their generated ids.
 */
function addIngredients(ingredients) {
  if (!ingredients || !ingredients.length) {
    return Promise.resolve([]);
  }

  var values = [];
  var rows = ingredients.map(function (ing, i) {
    var base = i * 2;
    values.push(ing.name, ing.type);
    return "($" + (base + 1) + ", $" + (base + 2) + ")";
  });

  var sql =
    "INSERT INTO ingredient (name, ingredient_type) VALUES " +
    rows.join(", ") +
    " RETURNING id, name, ingredient_type";

  return pool.query(sql, values).then(function (result) {
    return result.rows;
  });
}

module.exports = {
  getIngredients: getIngredients,
  addIngredients: addIngredients,
};
