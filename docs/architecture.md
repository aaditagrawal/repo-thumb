# Architecture

Repo Thumb is a static TypeScript application. Vite builds HTML, CSS, JavaScript, and local assets. There is no application server, database, authentication service, or frontend framework.

`src/main.ts` coordinates user actions and render scheduling. It coalesces rapid input with `requestAnimationFrame`, prevents stale font loads from drawing over newer edits, and debounces persistence. Repository requests are cancellable and have a deadline.

`src/model.ts` owns the design schema, validation, repository parsing, palettes, language mapping, and title wrapping. `src/github.ts` is the external API boundary. `src/lib/recipes.ts` owns portable recipes, links, and downloads. `src/lib/library.ts` owns storage and its memory fallback. These modules can be tested without a browser.

`src/renderer.ts` draws the shared preview/export layout. `src/render/gradient.ts` evaluates the fitted bicubic mesh. It caches spatial weights separately from colors, avoids per-pixel temporary arrays, and reuses its coarse color buffer. Three-entry caches bound retained gradient geometry and background canvases. Color changes reuse the field; title changes reuse the complete background.

`src/ui/` contains DOM boundaries. Saved-design rows use small CSS swatches instead of allocating and rendering a full-size canvas for every list item. No canvas work happens when storage is flushed on page exit.

The default artwork loads only its two fonts. The UI has a separate small font subset. Optional artwork fonts load when requested. Export reuses the same renderer at 1×, 2×, or 4× resolution.

`scripts/package-source.ts` builds the source download from an explicit allowlist. It rejects symlinks and credential patterns, and excludes environment files, local deployment metadata, dependencies, and generated artifacts.
