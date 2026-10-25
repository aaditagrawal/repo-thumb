import { mesh } from "../mesh";
import type { Design } from "../model";

const WIDTH = 1280,
  HEIGHT = 640,
  SAMPLE_WIDTH = 640,
  SAMPLE_HEIGHT = 320;
type Mesh = [number, number][][];

export function rgb(hex: string): number[] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function cubic(a: number, b: number, c: number, d: number, t: number): number {
  return (
    b +
    0.5 *
      t *
      (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a)))
  );
}

function sampleRow(
  grid: Mesh,
  row: number,
  column: number,
  t: number,
  channel: number,
): number {
  const values = grid[Math.max(0, Math.min(grid.length - 1, row))];
  const last = values.length - 1;
  const a = column - 1 < 0 ? 0 : values[Math.min(last, column - 1)][channel];
  const b = column < 0 ? 0 : values[Math.min(last, column)][channel];
  const c = column + 1 < 0 ? 0 : values[Math.min(last, column + 1)][channel];
  const d = column + 2 < 0 ? 0 : values[Math.min(last, column + 2)][channel];
  return cubic(a, b, c, d, t);
}

/** Bicubic sampling without per-pixel arrays, callbacks, or closures. */
export function sampleMesh(
  grid: Mesh,
  x: number,
  rawY: number,
  channel: number,
): number {
  if (x < -1) return 0;
  const y = Math.max(0, Math.min(grid.length - 1, rawY));
  const ix = Math.floor(x),
    iy = Math.floor(y),
    t = x - ix;
  return cubic(
    sampleRow(grid, iy - 1, ix, t, channel),
    sampleRow(grid, iy, ix, t, channel),
    sampleRow(grid, iy + 1, ix, t, channel),
    sampleRow(grid, iy + 2, ix, t, channel),
    y - iy,
  );
}

const geometryCache = new Map<string, Float64Array<ArrayBuffer>>();
const coarse = new Float32Array(SAMPLE_WIDTH * SAMPLE_HEIGHT * 3);

function spatialWeights(design: Design): Float64Array<ArrayBuffer> {
  const key = `${design.positionX},${design.positionY},${design.spread}`;
  const cached = geometryCache.get(key);
  if (cached) {
    geometryCache.delete(key);
    geometryCache.set(key, cached);
    return cached;
  }
  const weights = new Float64Array(SAMPLE_WIDTH * SAMPLE_HEIGHT * 2);
  const scale = design.spread / 100;
  for (let y = 0; y < SAMPLE_HEIGHT; y++) {
    const fy = (((y * 2 - design.positionY * 6.4) / scale + 270) / 639) * 16;
    for (let x = 0; x < SAMPLE_WIDTH; x++) {
      const fx =
        (((x * 2 - design.positionX * 12.8) / scale + 1000 - 600) / 679) * 24;
      if (fx < -1) continue;
      const index = (y * SAMPLE_WIDTH + x) * 2;
      weights[index] = Math.max(0, sampleMesh(mesh, fx, fy, 0));
      weights[index + 1] = Math.max(0, sampleMesh(mesh, fx, fy, 1));
    }
  }
  geometryCache.set(key, weights);
  if (geometryCache.size > 3) {
    const oldest = geometryCache.keys().next().value;
    if (oldest !== undefined) geometryCache.delete(oldest);
  }
  return weights;
}

/** Palette edits reuse the fitted spatial field. Double precision preserves the original image. */
export function gradientPixels(design: Design): Uint8ClampedArray<ArrayBuffer> {
  const weights = spatialWeights(design);
  const base = rgb(design.background),
    accent = rgb(design.color),
    highlight = rgb(design.highlight);
  for (let index = 0; index < SAMPLE_WIDTH * SAMPLE_HEIGHT; index++) {
    let a = (weights[index * 2] * design.strength) / 100;
    let b = (weights[index * 2 + 1] * design.strength) / 100;
    if (a + b > 1) {
      const total = a + b;
      a /= total;
      b /= total;
    }
    for (let c = 0; c < 3; c++)
      coarse[index * 3 + c] =
        base[c] + a * (accent[c] - base[c]) + b * (highlight[c] - base[c]);
  }
  const pixels = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y++)
    for (let x = 0; x < WIDTH; x++) {
      const cx = x >> 1,
        cy = y >> 1,
        nx = Math.min(639, cx + 1),
        ny = Math.min(319, cy + 1);
      const tx = (x % 2) / 2,
        ty = (y % 2) / 2;
      const noise =
        (((((x * 374761393 + y * 668265263) ^ (x * y * 1274126177)) >>> 0) %
          101) /
          100 -
          0.5) *
        0.7;
      const p = (y * WIDTH + x) * 4;
      for (let c = 0; c < 3; c++) {
        const top =
          coarse[(cy * SAMPLE_WIDTH + cx) * 3 + c] * (1 - tx) +
          coarse[(cy * SAMPLE_WIDTH + nx) * 3 + c] * tx;
        const bottom =
          coarse[(ny * SAMPLE_WIDTH + cx) * 3 + c] * (1 - tx) +
          coarse[(ny * SAMPLE_WIDTH + nx) * 3 + c] * tx;
        pixels[p + c] = top * (1 - ty) + bottom * ty + noise;
      }
      pixels[p + 3] = 255;
    }
  return pixels;
}
