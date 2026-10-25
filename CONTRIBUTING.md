# Contributing

Use Bun 1.4.4. Install with `bun install --frozen-lockfile`, then start the editor with `bun run dev`.

Run `bun run check`, `bun test`, and `bun run build` before submitting a change. Install the test browser once with `bunx playwright install chromium --only-shell`; `bun run test:e2e` exercises the production build. `bun run release:check` runs the full release gate, including formatting and the dependency audit.

Keep changes focused. Domain and persistence code should stay independent of the DOM. Preview and export must share the same renderer. Changes to the gradient or text placement should include an image comparison, because the supplied artwork is the visual contract.

Use `bun run benchmark` to measure performance against a running production preview on port 4320. State the browser, machine, throttling settings, sample count, and whether caches were cold. Include actual measurements with performance claims.

Do not commit account-specific repository inventories, generated cover batches, credentials, browser profiles, or local deployment identities. The source archive is deliberately built from an allowlist, excluding these files.

The project uses the MIT license. Fonts and logos retain their own licenses in `THIRD_PARTY_NOTICES.md`.

The Cloudflare beta tooling pins older Undici and Zod releases. `package.json` overrides them with patched versions for GHSA-xjj6-f33q-929c, GHSA-4qv8-2p9j-2685, GHSA-f72v-6w45-q472, and GHSA-mrhx-c7xc-m3w5. Keep these overrides until an upstream update includes the fixes, and verify both `bun audit` and `bun run deploy:check` when changing them.
