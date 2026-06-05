var Pool = require("pg").Pool;

/**
 * Shared Postgres connection pool. The connection details are taken from the
 * DATABASE_URL environment variable. The pool is lazy: it does not open a
 * connection until the first query is run.
 */
var pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", function (err) {
  console.error("Unexpected error on idle Postgres client:", err);
});

module.exports = pool;
