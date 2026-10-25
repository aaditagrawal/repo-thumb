import { expect, test } from "bun:test";
import { isPublicSourcePath } from "../../scripts/package-source";

test("source export excludes hosting identities, private batches, secrets, and archives", () => {
  for (const path of [
    ".openai/hosting.json",
    ".cloudflare/output/v0/config.json",
    ".wrangler/state.json",
    "batch/repositories.json",
    ".env",
    ".env.production",
    "../private.json",
    "node_modules/tool/index.js",
    "dist/assets/app.js",
    "public/repo-thumb-source.zip",
    "artifacts/report.json",
    ".git/config",
  ])
    expect(isPublicSourcePath(path)).toBe(false);
  for (const path of [
    "src/main.ts",
    "public/favicon.svg",
    "public/fonts/ui.woff2",
    ".github/workflows/ci.yml",
    ".env.example",
    "LICENSE",
  ])
    expect(isPublicSourcePath(path)).toBe(true);
});
