import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateMinutes } from "./minutes.js";

const app = express();
const port = Number(process.env.PORT) || 3001;
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(currentDirectory, "..");

app.use(express.json({ limit: "5mb" }));

app.post("/api/minutes", async (request, response) => {
  try {
    const minutes = await generateMinutes(request.body?.transcript);
    response.json(minutes);
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 502;
    if (status >= 500) {
      console.error("Meeting-minutes generation failed.", error);
    }
    response.status(status).json({
      error: status >= 500 && status !== 503
        ? "OpenAI could not process this transcript. Check the server logs and try again."
        : error.message,
    });
  }
});

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
