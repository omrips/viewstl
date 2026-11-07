import { createAPI } from "./api.js";
export const { analyzeFile, analyzeBuffer, createAnalyzer } = createAPI(
  new URL("./analysis-worker.js", import.meta.url),
);
