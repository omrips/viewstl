import { readFile } from "node:fs/promises";
import {
  analyzeFile,
  analyzeBuffer,
  createAnalyzer,
  type AnalysisReport,
} from "viewstl/node";
async function example() {
  const signal = new AbortController().signal;
  const report: AnalysisReport = await analyzeFile(
    new URL("file:///models/part.stl"),
    {
      units: "mm",
      level: "detailed",
      signal,
      timeout_ms: 30000,
      limits: { max_file_bytes: 1024 ** 2 },
      on_progress(progress) {
        console.log(progress.phase);
      },
      profile: { technology: "fdm", build_volume_mm: [200, 200, 200] },
    },
  );
  const volume: number | null = report.volume_mm3;
  const dimensions: readonly number[] | null = report.dimensions_mm;
  const buffer = await readFile("part.stl");
  await analyzeBuffer(buffer, { filename: "part.stl", units: "mm" });
  const analyzer = createAnalyzer({
    concurrency: 1,
    max_queue: 4,
    max_queued_bytes: 1024 ** 2,
  });
  await analyzer.analyzeBuffer(buffer.buffer as ArrayBuffer, { format: "stl" });
  await analyzer.dispose();
  return { volume, dimensions };
}
void example;
