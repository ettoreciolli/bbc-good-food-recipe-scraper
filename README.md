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

- `ingredientsParsed` &mdash; one entry per matched ingredient: `{ id, index, name }`,
  where `index` is the ingredient line the match came from (a line can match
  more than one ingredient).
- `notFoundIngredients` &mdash; the indexes of the ingredient lines that matched
  nothing.

##### See it in action - [https://bbc-food-scraper.glitch.me](https://bbc-food-scraper.glitch.me)
