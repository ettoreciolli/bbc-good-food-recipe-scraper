-- Schema for the parsed-recipe tables. Run this against your Neon Postgres
-- database (the same one DATABASE_URL points at) to create the tables the
-- scraper writes settled recipes into. The existing `ingredient` table is
-- assumed to already exist.

create extension if not exists pgcrypto;

-- One row per scraped recipe, keyed by its source url.
create table if not exists parsed_recipes (
  id         uuid primary key default gen_random_uuid(),
  url        text not null unique,
  title      text,
  created_at timestamptz not null default now()
);

-- One row per matched ingredient segment of a recipe, linking the recipe to a
-- known ingredient together with its parsed quantity and unit.
create table if not exists recipe_ingredients (
  id            uuid primary key default gen_random_uuid(),
  recipe_id     uuid not null references parsed_recipes (id) on delete cascade,
  ingredient_id uuid not null references ingredient (id),
  line_index    integer not null,
  segment_index integer not null,
  unit          text,
  quantity      text,
  unique (recipe_id, line_index, segment_index)
);

create index if not exists recipe_ingredients_recipe_id_idx
  on recipe_ingredients (recipe_id);
create index if not exists recipe_ingredients_ingredient_id_idx
  on recipe_ingredients (ingredient_id);
