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

-- ---------------------------------------------------------------------------
-- Authentication (Better Auth)
--
-- Better Auth uses camelCase column names, so they must be created quoted to
-- match the queries it issues. This matches the core email/password schema
-- (`npx @better-auth/cli generate` produces the same shape).
-- ---------------------------------------------------------------------------

create table if not exists "user" (
  "id"            text primary key,
  "name"          text not null,
  "email"         text not null unique,
  "emailVerified" boolean not null default false,
  "image"         text,
  "createdAt"     timestamptz not null default now(),
  "updatedAt"     timestamptz not null default now()
);

create table if not exists "session" (
  "id"        text primary key,
  "expiresAt" timestamptz not null,
  "token"     text not null unique,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "ipAddress" text,
  "userAgent" text,
  "userId"    text not null references "user" ("id") on delete cascade
);

create table if not exists "account" (
  "id"                    text primary key,
  "accountId"             text not null,
  "providerId"            text not null,
  "userId"                text not null references "user" ("id") on delete cascade,
  "accessToken"           text,
  "refreshToken"          text,
  "idToken"               text,
  "accessTokenExpiresAt"  timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  "scope"                 text,
  "password"              text,
  "createdAt"             timestamptz not null default now(),
  "updatedAt"             timestamptz not null default now()
);

create table if not exists "verification" (
  "id"         text primary key,
  "identifier" text not null,
  "value"      text not null,
  "expiresAt"  timestamptz not null,
  "createdAt"  timestamptz not null default now(),
  "updatedAt"  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Per-user features
-- ---------------------------------------------------------------------------

-- Recipes a user has favorited.
create table if not exists favorites (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null references "user" ("id") on delete cascade,
  recipe_id  uuid not null references parsed_recipes (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, recipe_id)
);
create index if not exists favorites_user_id_idx on favorites (user_id);

-- A user's kitchen inventory, one row per ingredient they have on hand.
create table if not exists inventory (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null references "user" ("id") on delete cascade,
  ingredient_id uuid not null references ingredient (id),
  quantity      text,
  unit          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, ingredient_id)
);
create index if not exists inventory_user_id_idx on inventory (user_id);
