import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createAPI } from "./api.js";
export const { analyzeFile, analyzeBuffer, createAnalyzer } = createAPI(
  pathToFileURL(join(__dirname, "analysis-worker.js")),
);
