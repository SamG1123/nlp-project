import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleMinutesRequest } from "./minutesHandler.js";

const app = express();
const port = Number(process.env.PORT) || 3001;
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(currentDirectory, "..");

app.use(express.json({ limit: "5mb" }));

app.all("/api/minutes", handleMinutesRequest);

app.use((error, request, response, next) => {
  if (error instanceof SyntaxError && "body" in error) {
    response.status(400).json({ error: "Request body must be valid JSON." });
    return;
  }
  if (error.type === "entity.too.large") {
    response.status(413).json({ error: "Transcript request is too large." });
    return;
  }
  next(error);
});

app.use(express.static(path.join(projectDirectory, "dist")));
app.get("*", (request, response, next) => {
  response.sendFile(path.join(projectDirectory, "dist", "index.html"), (error) => {
    if (error) next();
  });
});

app.listen(port, () => {
  console.log(`MeetBrief API listening on http://localhost:${port}`);
});
