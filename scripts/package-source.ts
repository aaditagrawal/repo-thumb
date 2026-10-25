import { zipSync, strToU8 } from "fflate";
import { lstat, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const directories = ["src", "public", "scripts", "tests", "docs", ".github"];
const rootFiles = [
  "package.json",
  "bun.lock",
  "tsconfig.json",
  "vite.config.ts",
  "cloudflare.config.ts",
  "playwright.config.ts",
  "index.html",
  "README.md",
  "LICENSE",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "THIRD_PARTY_NOTICES.md",
  ".gitignore",
  ".gitattributes",
  ".prettierignore",
  ".env.example",
  "netlify.toml",
];
const disallowed =
  /(?:^|\/)(?:node_modules|dist|batch|artifacts|test-results|\.git|\.openai|\.cloudflare|\.wrangler)(?:\/|$)|(?:^|\/)\.env(?!\.example$)|\.(?:zip|tar\.gz|log)$/;
const secretPattern =
  /gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|sk-(?:proj-)?[A-Za-z0-9_-]{40,}|art_v2_[A-Za-z0-9_]{20,}/;

export function isPublicSourcePath(path: string): boolean {
  return (
    !path.startsWith("/") &&
    !path.split("/").includes("..") &&
    !disallowed.test(path)
  );
}

async function packageSource(): Promise<void> {
  const files: Record<string, Uint8Array> = {};
  async function add(path: string): Promise<void> {
    const name = relative(root, path).replaceAll("\\", "/");
    if (!isPublicSourcePath(name)) return;
    const info = await lstat(path);
    if (info.isSymbolicLink())
      throw new Error(`Source archives cannot contain symlinks: ${name}`);
    if (info.isDirectory()) {
      for (const child of (await readdir(path)).sort())
        await add(join(path, child));
      return;
    }
    const content = new Uint8Array(await Bun.file(path).arrayBuffer());
    if (
      /\.(?:ts|js|json|md|html|css|yml|toml|example)$/.test(name) &&
      secretPattern.test(new TextDecoder().decode(content))
    )
      throw new Error(`Potential credential in public source: ${name}`);
    files[`repo-thumb/${name}`] = content;
  }
  for (const name of rootFiles) await add(join(root, name));
  for (const directory of directories) await add(join(root, directory));
  files["repo-thumb/SOURCE_ARCHIVE.txt"] = strToU8(
    "Repo Thumb source, MIT licensed. https://github.com/aaditagrawal/repo-thumb\nRun bun install --frozen-lockfile, then bun run dev.\n",
  );
  const bytes = zipSync(files, {
    level: 6,
    mtime: new Date("2026-01-01T00:00:00Z"),
  });
  await Bun.write(join(root, "dist/repo-thumb-source.zip"), bytes);
  await Bun.write(join(root, "public/repo-thumb-source.zip"), bytes);
  process.stdout.write(
    `Public source: ${Object.keys(files).length} files, ${bytes.length} bytes; private artifacts excluded.\n`,
  );
}

if (import.meta.main) await packageSource();
