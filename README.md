# BBC Good Food Recipe Scraper

#### Strip out the chaff from a BBC Food / BBC Good Food Recipe Page

A simple script that, given a [BBC Food](https://www.bbc.co.uk/food) or [BBC Good Food](https://www.bbcgoodfood.com/) recipe URL, will return the
list of required ingredients and cooking method.

Requires Node JS to be installed locally.

Clone the repository and cd into directory

```
npm install
```

```
npm start
```

`npm start` compiles the TypeScript (backend to `dist/`, frontend to
`public/js/`) and then runs the server. Other scripts:

- `npm run build` &mdash; compile backend and frontend.
- `npm run typecheck` &mdash; type-check both without emitting.
- `npm run dev` &mdash; run the backend with `ts-node-dev` (auto-restart).

The project is written in TypeScript. Backend sources live in `index.ts`,
`routes/`, `db/` and `lib/`; the AngularJS frontend lives in `public/ts/` and
compiles to `public/js/`. Shared types are organised under `types/`
(`db`, `routes`, `ui`, `lib`) in a global `App` namespace.

Enter the url of a BBC Good Food Recipe into the input field

### Ingredient matching

Scraped ingredient lines are matched against a Postgres `ingredient` table so
the UI can flag which ingredients are recognised. The table is expected to have
the following shape:

| column | type                       |
| ------ | -------------------------- |
| id     | uuid                       |
| name   | text                       |
| type   | enum (`liquid` / `solid`)  |

The database is accessed through the [Neon serverless
driver](https://github.com/neondatabase/serverless) (`@neondatabase/serverless`),
which queries Postgres over HTTP. Set the connection string via the
`DATABASE_URL` environment variable. If the database is unavailable the scraper
still returns the recipe, just without ingredient matches. The API response
includes:

- `ingredientsParsed` &mdash; one entry per matched ingredient segment:
  `{ id, index, segmentIndex, name, type, amount, unit, parseError, ... }`,
  where `index` is the ingredient line the match came from (a line can match
  more than one ingredient) and `amount`/`unit` are parsed from the text before
  the matched name. `parseError` is set when the amount/unit can't be parsed
  cleanly (e.g. a liquid unit on a solid ingredient).
- `notFoundIngredients` &mdash; the indexes of the ingredient lines that matched
  nothing.

### Saving parsed recipes

A scraped recipe can be persisted once it is **settled** &mdash; every line is
matched to a known ingredient and no line has an amount/unit parse error. The
recipe view's "Save recipe" button is enabled only then, and `POST /api/recipes`
re-validates server-side before writing.

Two tables hold the saved data (create them with
[`db/schema.sql`](db/schema.sql)):

- `parsed_recipes` &mdash; `id`, `url` (unique), `title`, `created_at`. One row
  per recipe, upserted by url.
- `recipe_ingredients` &mdash; `id`, `recipe_id`, `ingredient_id`, `line_index`,
  `segment_index`, `unit`, `quantity`. One row per matched ingredient segment.

Amounts and units are parsed by `lib/parseMeasurement.ts`, which handles
decimals, fractions (`1/2`, `½`), ranges (`2-3`) and dual units (`400g/14oz`,
keeping the first). Units are categorised as solid, liquid or shared
(spoons/cups), and a unit must be valid for its ingredient's type.

### Accounts (Better Auth)

Accounts are **optional**. Authentication is handled by
[Better Auth](https://www.better-auth.com/) mounted in Express at
`/api/auth/*`, using email + password (email verification is off, so accounts
work immediately). It shares the same Neon Postgres database. Signing in unlocks
two per-user features on the **Account** tab:

- **Favorites** &mdash; the ♥ button on the recipe view favorites the current
  recipe (creating its `parsed_recipes` row by url if needed).
  `GET/POST /api/favorites`, `DELETE /api/favorites/:recipeId`.
- **Kitchen inventory** &mdash; ingredients you have on hand, each linked to the
  `ingredient` table with an amount + unit (validated against the ingredient's
  type). `GET/POST /api/inventory`, `DELETE /api/inventory/:ingredientId`.

Set these environment variables:

- `BETTER_AUTH_SECRET` &mdash; a long random string (`openssl rand -base64 32`).
- `BETTER_AUTH_URL` &mdash; the app's base URL, e.g. `http://localhost:3000`.

The auth tables (`user`, `session`, `account`, `verification`) and the
`favorites` / `inventory` tables are created by
[`db/schema.sql`](db/schema.sql). The auth columns are camelCase to match what
Better Auth queries (equivalent to `npx @better-auth/cli generate`).

##### See it in action - [https://bbc-food-scraper.glitch.me](https://bbc-food-scraper.glitch.me)
