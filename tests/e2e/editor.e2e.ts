import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Download PNG" }),
  ).toBeEnabled();
});

test("renders, shuffles colors, edits text, and keeps the layout inside the viewport", async ({
  page,
}) => {
  const previous = await page.locator("#color").inputValue();
  await page.getByRole("button", { name: "Shuffle colors" }).click();
  await expect(page.locator("#color")).not.toHaveValue(previous);
  await page
    .getByRole("textbox", { name: "Repository name", exact: true })
    .fill("A much longer project name");
  await expect(page.locator("#preview")).toHaveAttribute(
    "aria-label",
    /A much longer project name/,
  );
  await expect(
    page.getByRole("button", { name: "Download PNG" }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("loads GitHub data and preserves the current design after a lookup error", async ({
  page,
}) => {
  await page.route("https://api.github.com/repos/owner/project", (route) =>
    route.fulfill({ json: { full_name: "owner/project", language: "Rust" } }),
  );
  await page
    .getByRole("textbox", { name: "GitHub repository" })
    .fill("owner/project");
  await page.getByRole("button", { name: "Load repository" }).click();
  await expect(page.locator("#title")).toHaveValue("project");
  await expect(page.getByLabel("Language", { exact: true })).toHaveValue(
    "Rust",
  );
  await page.route("https://api.github.com/repos/owner/missing", (route) =>
    route.fulfill({ status: 404, json: {} }),
  );
  await page
    .getByRole("textbox", { name: "GitHub repository" })
    .fill("owner/missing");
  await page.getByRole("button", { name: "Load repository" }).click();
  await expect(page.locator("#repo-status")).toBeVisible();
  await expect(page.locator("#title")).toHaveValue("project");
  await page
    .getByRole("button", { name: /Continue with manual details/ })
    .click();
  await expect(page.locator("#title")).toHaveValue("missing");
});

test("exports a real 2x PNG and a portable recipe", async ({ page }) => {
  await page
    .getByRole("combobox", { name: "PNG resolution" })
    .selectOption("2");
  const image = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PNG" }).click();
  const downloaded = await image;
  const path = await downloaded.path();
  if (!path) throw new Error("Download missing");
  const bytes = await readFile(path);
  expect(bytes.subarray(1, 4).toString()).toBe("PNG");
  expect(bytes.readUInt32BE(16)).toBe(2560);
  expect(bytes.readUInt32BE(20)).toBe(1280);
  const recipe = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export recipe/ }).click();
  const recipePath = await (await recipe).path();
  if (!recipePath) throw new Error("Recipe missing");
  const data = JSON.parse(await readFile(recipePath, "utf8"));
  expect(data.version).toBe(1);
  expect(data.repository).toBe("aaditagrawal/fc-menu");
});

test("imports recipes, persists changes, and removes saved designs", async ({
  page,
}) => {
  await page.locator("#recipe-file").setInputFiles({
    name: "cover.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 1,
        repository: "owner/hello",
        title: "hello <world>",
        language: "Python",
        color: "#a4df72",
        highlight: "#d7f4b6",
      }),
    ),
  });
  await expect(page.locator("#title")).toHaveValue("hello <world>");
  await expect(page.locator("#save-status")).toHaveText("Saved locally");
  await page.reload();
  await expect(page.locator("#title")).toHaveValue("hello <world>");
  const open = page.getByRole("button", {
    name: "Open saved owner/hello design",
  });
  await open.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#save-status")).toHaveText("Saved locally");
  await expect(open).toBeFocused();
  // Remove while another autosave is queued. It must stay removed after that delay.
  await page.locator("#title").fill("Updated title");
  await page
    .getByRole("button", { name: "Remove saved owner/hello design" })
    .click();
  await expect(
    page.getByRole("button", { name: "Open saved owner/hello design" }),
  ).toHaveCount(0);
  await expect(page.locator("#save-status")).toHaveText("Not saved");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Open saved owner/hello design" }),
  ).toHaveCount(0);
});

test("resumes a queued render after returning from the back-forward cache", async ({
  page,
}) => {
  await page.evaluate(() => {
    const title = document.querySelector("#title");
    if (!(title instanceof HTMLInputElement)) throw new Error("Missing title");
    title.value = "restored-frame";
    title.dispatchEvent(new Event("input", { bubbles: true }));
    window.dispatchEvent(
      new PageTransitionEvent("pagehide", { persisted: true }),
    );
    window.dispatchEvent(
      new PageTransitionEvent("pageshow", { persisted: true }),
    );
  });
  await expect(
    page.getByRole("button", { name: "Download PNG" }),
  ).toBeEnabled();
  await expect(page.locator("#preview")).toHaveAttribute(
    "aria-label",
    /restored-frame/,
  );
});

test("works when browser storage is blocked", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Blocked", "SecurityError");
      },
    }),
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Download PNG" }),
  ).toBeEnabled();
  await page.locator("#title").fill("offline-ready");
  await expect(page.locator("#save-status")).toHaveText(
    "Export a recipe to save",
  );
});

test("has no serious accessibility violations", async ({ page }) => {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
});

test("the frame stays visible while the scroll cue follows available content", async ({
  page,
}) => {
  const cue = page.getByRole("button", { name: "Scroll down", exact: true });
  await expect(cue).toBeVisible();
  await cue.focus();
  await page.keyboard.press("Enter");
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);

  // The lower frame remains anchored to the viewport after scrolling.
  const frame = await page.evaluate(() => {
    const style = getComputedStyle(document.body, "::after");
    return {
      position: style.position,
      bottom: style.bottom,
      border: parseFloat(style.borderBottomWidth),
      blocksClicks: style.pointerEvents !== "none",
    };
  });
  expect(frame).toMatchObject({
    position: "fixed",
    bottom: "0px",
    blocksClicks: false,
  });
  expect(frame.border).toBeGreaterThan(0);

  await page.evaluate(() =>
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "instant",
    }),
  );
  await expect(cue).toBeHidden();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(cue).toBeVisible();

  const viewport = page.viewportSize();
  if (!viewport) throw new Error("Missing viewport");
  await page.setViewportSize({ width: viewport.width, height: 3000 });
  await expect(cue).toBeHidden();
  await page.setViewportSize(viewport);
  await expect(cue).toBeVisible();
});

test("the paper surface fills wide and tall viewports inside a thin frame", async ({
  page,
}) => {
  for (const viewport of [
    { width: 2560, height: 1440 },
    { width: 3200, height: 1800 },
    { width: 1440, height: 2200 },
  ]) {
    await page.setViewportSize(viewport);
    const bounds = await page.locator(".app-shell").boundingBox();
    if (!bounds) throw new Error("Missing app surface");
    const frame = await page.evaluate(() =>
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--frame-size",
        ),
      ),
    );
    expect(bounds.x).toBeCloseTo(frame, 0);
    expect(bounds.width).toBeCloseTo(viewport.width - frame * 2, 0);
    expect(bounds.y + bounds.height).toBeGreaterThanOrEqual(
      viewport.height - frame - 1,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await expect(
    page.getByRole("button", { name: "Scroll down", exact: true }),
  ).toBeHidden();
});
