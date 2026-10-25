import { chromium } from "@playwright/test";

const url = new URL(process.argv[2] ?? "http://127.0.0.1:4320/");
const headers = await Bun.file(
  new URL("../public/_headers", import.meta.url),
).text();
const policy = headers.match(/Content-Security-Policy:\s*(.+)/)?.[1];
if (!policy) throw new Error("Missing CSP");
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
const errors: string[] = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
await page.route("**/*", async (route) => {
  if (route.request().resourceType() !== "document") return route.continue();
  const response = await route.fetch();
  await route.fulfill({
    response,
    headers: { ...response.headers(), "content-security-policy": policy },
  });
});
await page.goto(url.toString());
await page.getByRole("button", { name: "Download PNG" }).waitFor();
await page.waitForFunction(() => {
  const button = document.querySelector("#download-button");
  return button instanceof HTMLButtonElement && !button.disabled;
});
await page.getByText("Typography & more", { exact: false }).click();
await page.getByLabel("Title font").selectOption("Geist");
await page.waitForFunction(() => {
  const button = document.querySelector("#download-button");
  return button instanceof HTMLButtonElement && !button.disabled;
});
const source = await page.locator(".source-button").getAttribute("href");
if (!source || !new URL(source, url).pathname.startsWith(url.pathname))
  throw new Error("Source link lost its base path");
const archive = await context.request.get(new URL(source, url).toString());
if (!archive.ok())
  throw new Error(`Source download returned ${archive.status()}`);
const bytes = await archive.body();
if (bytes.subarray(0, 2).toString() !== "PK")
  throw new Error("Source download is not a ZIP");
if (errors.length) throw new Error(errors.join("\n"));
await browser.close();
process.stdout.write(
  JSON.stringify({
    url: url.toString(),
    csp: "passed",
    optionalFont: "passed",
    sourceArchive: "passed",
  }) + "\n",
);
