import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const url = process.env.BENCH_URL ?? "http://127.0.0.1:4320";
const label = process.env.BENCH_LABEL ?? "current";
const output = resolve(process.env.BENCH_OUTPUT ?? "artifacts/performance");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const runs = [];
for (let run = 0; run < 5; run++) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await page.goto(url);
  await page.waitForFunction(() => {
    const canvas = document.querySelector("#preview");
    const button = document.querySelector("#download-button");
    return (
      canvas instanceof HTMLCanvasElement &&
      button instanceof HTMLButtonElement &&
      !button.disabled &&
      canvas.getContext("2d")?.getImageData(0, 0, 1, 1).data[3] === 255
    );
  });
  const startup = await page.evaluate(() => ({
    readyMs: performance.now(),
    fcpMs:
      performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? 0,
    resources: performance
      .getEntriesByType("resource")
      .filter((entry) => entry instanceof PerformanceResourceTiming)
      .map((entry) => ({ url: entry.name, bytes: entry.encodedBodySize })),
  }));
  const interactions = [];
  for (const color of ["#f0aa44", "#d97cbe", "#7cc892", "#79a3df", "#34e1f8"]) {
    interactions.push(
      await page.evaluate(async (value) => {
        const input = document.querySelector("#color");
        const canvas = document.querySelector("#preview");
        if (
          !(input instanceof HTMLInputElement) ||
          !(canvas instanceof HTMLCanvasElement)
        )
          throw new Error("Missing benchmark controls");
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("Canvas unavailable");
        const previous = context.getImageData(1000, 280, 1, 1).data.join();
        const start = performance.now();
        input.value = value;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        while (performance.now() - start < 4000) {
          await new Promise(requestAnimationFrame);
          if (context.getImageData(1000, 280, 1, 1).data.join() !== previous)
            return performance.now() - start;
        }
        throw new Error("Preview did not update");
      }, color),
    );
  }
  if (run === 0) {
    await page.screenshot({
      path: resolve(output, `${label}-desktop.png`),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: resolve(output, `${label}-mobile.png`),
      fullPage: true,
    });
    const canvas = await page
      .locator("#preview")
      .evaluate((node) =>
        node instanceof HTMLCanvasElement ? node.toDataURL() : "",
      );
    await Bun.write(
      resolve(output, `${label}-canvas.png`),
      Buffer.from(canvas.split(",")[1], "base64"),
    );
  }
  runs.push({ ...startup, interactions, failures });
  await context.close();
}
await browser.close();
const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const report = {
  label,
  url,
  browser:
    "Chromium, headless; 1440 × 1000; five isolated cold contexts; local production server; no CPU or network throttling",
  startupMedianMs: median(runs.map((run) => run.readyMs)),
  fcpMedianMs: median(runs.map((run) => run.fcpMs)),
  gradientInteractionMedianMs: median(runs.flatMap((run) => run.interactions)),
  initialResourceBytes: runs[0].resources.reduce(
    (sum, resource) => sum + resource.bytes,
    0,
  ),
  initialResourceCount: runs[0].resources.length,
  runs,
};
await Bun.write(
  resolve(output, `${label}.json`),
  JSON.stringify(report, null, 2),
);
process.stdout.write(JSON.stringify({ ...report, runs: undefined }) + "\n");
