import {
  analyzeFile,
  analyzeBuffer,
  createAnalyzer,
  type AnalysisReport,
} from "@omrips/viewstl/node";
async function example() {
  const report: AnalysisReport = await analyzeFile("part.stl", { units: "mm" });
  await analyzeBuffer(Buffer.alloc(100), { format: "stl" });
  await createAnalyzer({ concurrency: 1 }).dispose();
  return report.volume_mm3;
}
void example;
