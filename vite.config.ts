import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const base = process.env.BASE_PATH ?? "/";
if (!/^\/(?:[\w.-]+\/)*$/.test(base))
  throw new Error("BASE_PATH must be / or a path such as /repo-thumb/.");

export default defineConfig(async () => {
  const cloudflareBuild = process.env.CF_BUILD === "1";
  return {
    base,
    plugins: cloudflareBuild
      ? (await import("@cloudflare/vite-plugin")).cloudflare()
      : [],
    server: {
      host: "0.0.0.0",
      fs: {
        strict: true,
        allow: [fileURLToPath(new URL(".", import.meta.url))],
      },
    },
    preview: { host: "0.0.0.0" },
    build: {
      target: "es2022",
      sourcemap: false,
      outDir: cloudflareBuild ? "dist-cloudflare" : "dist",
    },
  };
});
