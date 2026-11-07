import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = await import(
  process.env.VIEWSTL_PLAYWRIGHT || "playwright"
);
const base = process.env.VIEWSTL_QA_URL || "http://127.0.0.1:8872";
const browser = await chromium.launch({ channel: "msedge", headless: true });
await mkdir("test-results/exports", { recursive: true });
try {
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage(),
    errors = [],
    requests = [],
    downloads = [];
  page.on("pageerror", (e) => errors.push(e.message));
  context.on("request", (r) => {
    // Edge opens its internal downloads hub; those edge:// resources are browser UI.
    if (!r.url().startsWith("edge://"))
      requests.push({ url: r.url(), method: r.method() });
  });
  page.on("download", (d) => downloads.push(d.suggestedFilename()));
  await page.goto(base + "/tests/v2/export-browser.html");
  await page.locator("#run").click();
  await page.waitForFunction(() => window.exportResults, null, {
    timeout: 180000,
  });
  const result = await page.evaluate(() => window.exportResults);
  Object.assign(result, {
    browser: browser.version(),
    mode: "Headless desktop Edge; no mobile/device emulation",
    errors,
    downloads,
    network: {
      requests: requests.length,
      otherRequests: requests.filter(
        (r) =>
          !r.url.startsWith(base + "/") &&
          !r.url.startsWith("blob:" + base + "/"),
      ),
      nonGetRequests: requests.filter((r) => r.method !== "GET"),
      allSameOriginGET: requests.every(
        (r) =>
          (r.url.startsWith(base + "/") ||
            r.url.startsWith("blob:" + base + "/")) &&
          r.method === "GET",
      ),
    },
  });
  await writeFile(
    "test-results/exports/browser.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  await page.screenshot({
    path: "test-results/exports/browser.png",
    fullPage: true,
  });
  console.log(JSON.stringify(result, null, 2));
  assert.equal(result.failed, 0);
  assert.deepEqual(errors, []);
  assert.ok(downloads.includes("download.stl"));
  assert.equal(result.network.allSameOriginGET, true);
  // Keep the existing native/legacy compatibility suite in the regression check.
  await page.goto(base + "/tests/v2/browser.html");
  await page.locator("#run").click();
  await page.waitForFunction(
    () => /\d+ passed/.test(document.getElementById("results").textContent),
    null,
    { timeout: 120000 },
  );
  const compatibility = await page.locator("#results").innerText();
  await writeFile("test-results/exports/compatibility.txt", compatibility);
  console.log(compatibility);
  assert.ok(!compatibility.includes("FAIL"));
} finally {
  await browser.close();
}
