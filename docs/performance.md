# Performance measurements

Measured on the same Linux host using Chromium 156 in headless mode, a 1440 × 1000 viewport, and the local production preview server. Each version used five isolated browser contexts. Browser caches were cold; the operating-system file cache was not reset. No CPU or network throttling was applied.

| Measurement                 |   Before |    After | Reduction |
| --------------------------- | -------: | -------: | --------: |
| Time to first ready preview | 313.0 ms | 117.1 ms |       63% |
| Gradient update latency     |  69.2 ms |  23.8 ms |       66% |
| Initial resource payload    | 513.7 KB | 137.3 KB |       73% |

Startup and interaction times are medians. Startup includes local requests, font loading, and the first usable preview. Gradient latency includes the input handler, animation-frame scheduling, and rendering. Initial payload is the encoded resource size observed when the preview becomes ready, excluding later optional fonts and the comparison image. These are controlled local measurements, not field Core Web Vitals or a Lighthouse score.

The exported 1280 × 640 reference image was compared before and after the renderer changes. It had zero changed pixels, zero maximum channel difference, and zero RGB error in the same browser. That parity check covers the default reference artwork; it is not a claim that all browser engines rasterize text identically.

## Reproduce

```sh
bun run build
bun run preview --port 4320 --strictPort
# In another terminal:
BENCH_LABEL=current bun run benchmark
```

Reports and screenshots are written to `artifacts/performance/`, which is ignored by Git and excluded from the source archive. Set `BENCH_URL`, `BENCH_LABEL`, or `BENCH_OUTPUT` to compare another build. Keep the browser and measurement environment consistent.

## Changes responsible for the improvement

The old implementation re-rendered full-size library thumbnails and then the main preview whenever storage was saved. The current library does no canvas work. The renderer separately caches spatial weights and palette backgrounds, removes per-pixel callback/array allocation, reuses its coarse buffer, and avoids unnecessary canvas resizing. Startup loads the small UI font subset plus the two default artwork fonts; optional artwork fonts remain deferred.
