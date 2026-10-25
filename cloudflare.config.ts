import { defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    name: "repo-thumb",
    compatibilityDate: "2026-10-25",
    domains: ["repothumb.coolstuff.work"],
    workersDev: false,
    previewUrls: false,
    assets: { notFoundHandling: "none" },
    observability: {
      enabled: true,
      traces: { enabled: true },
    },
  },
});
