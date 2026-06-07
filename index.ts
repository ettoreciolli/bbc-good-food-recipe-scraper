import path from "path";
import express, { Request, Response } from "express";
import scrapeRouter from "./routes/api/scrape";
import ingredientsRouter from "./routes/api/ingredients";
import recipesRouter from "./routes/api/recipes";

const app = express();

app.use(express.json());
// Serve the static frontend from <project root>/public. Resolving against the
// working directory (npm sets it to the package root) works whether we're run
// from the built dist/ output or straight from source via tsx in dev.
const publicDir = path.join(process.cwd(), "public");
app.use(express.static(publicDir));

app.use("/api/scrape", scrapeRouter);
app.use("/api/ingredients", ingredientsRouter);
app.use("/api/recipes", recipesRouter);

app.get("/", (req: Request, res: Response) => {
  res.send({ message: "Welcome to the BBC Food Recipe Scraper" });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log("Listening on port " + port);
  console.log("Serving static files from " + publicDir);
});
