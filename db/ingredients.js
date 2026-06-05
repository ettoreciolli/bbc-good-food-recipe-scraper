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
    .query("SELECT id, name, type FROM ingredient")
    .then(function (result) {
      return result.rows;
    });
}

module.exports = {
  getIngredients: getIngredients,
};
