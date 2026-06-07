import path from "path";
import express, { Request, Response } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import scrapeRouter from "./routes/api/scrape";
import ingredientsRouter from "./routes/api/ingredients";
import recipesRouter from "./routes/api/recipes";
import favoritesRouter from "./routes/api/favorites";
import inventoryRouter from "./routes/api/inventory";

const app = express();

// Better Auth must handle /api/auth/* with the raw body, so it is mounted
// before express.json().
app.all("/api/auth/*", toNodeHandler(auth));

app.use(express.json());
// Serve the static frontend from <project root>/public. Resolving against the
// working directory (npm sets it to the package root) works whether we're run
// from the built dist/ output or straight from source via tsx in dev.
const publicDir = path.join(process.cwd(), "public");
app.use(express.static(publicDir));

app.use("/api/scrape", scrapeRouter);
app.use("/api/ingredients", ingredientsRouter);
app.use("/api/recipes", recipesRouter);
app.use("/api/favorites", favoritesRouter);
app.use("/api/inventory", inventoryRouter);

app.get("/", (req: Request, res: Response) => {
  res.send({ message: "Welcome to the BBC Food Recipe Scraper" });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log("Listening on port " + port);
  console.log("Serving static files from " + publicDir);
});
