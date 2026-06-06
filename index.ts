import path from "path";
import express, { Request, Response } from "express";
import scrapeRouter from "./routes/api/scrape";
import ingredientsRouter from "./routes/api/ingredients";

const app = express();

app.use(express.json());
// Compiled output lives in dist/, so the static files sit one level up.
app.use(express.static(path.join(__dirname, "..", "public")));

app.use("/api/scrape", scrapeRouter);
app.use("/api/ingredients", ingredientsRouter);

app.get("/", (req: Request, res: Response) => {
  res.send({ message: "Welcome to the BBC Food Recipe Scraper" });
});

app.listen(Number(process.env.PORT), () => {
  console.log("Listening on Port " + process.env.PORT);
});
