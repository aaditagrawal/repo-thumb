import { gradientPixels, rgb, sampleMesh } from "./render/gradient";
import { iconMesh } from "./icon-mesh";
import { defaultDesign, languageLogos, titleLines } from "./model";
import type { Design } from "./model";

const logoFiles = import.meta.glob<string>("./assets/logos/*.svg", {
  query: "?raw",
  import: "default",
  eager: true,
});
const paths = new Map<string, Path2D>();
for (const [file, svg] of Object.entries(logoFiles)) {
  const data = [...svg.matchAll(/<path[^>]*\bd="([^"]+)"/g)]
    .map((match) => match[1])
    .join(" ");
  paths.set(file.split("/").pop()?.replace(".svg", "") ?? "", new Path2D(data));
}

const loadedFonts = new Map<string, Promise<void>>();
const fontSources = {
  Display: { file: "display.woff2", weight: "700" },
  Mono: { file: "mono.woff2", weight: "400" },
  Geist: { file: "geist.woff2", weight: "700" },
  Inter: { file: "inter.woff2", weight: "100 900" },
};
function loadFont(name: keyof typeof fontSources): Promise<void> {
  const existing = loadedFonts.get(name);
  if (existing) return existing;
  const source = fontSources[name];
  const promise = new FontFace(
    name,
    `url(${import.meta.env.BASE_URL}fonts/${source.file})`,
    { weight: source.weight },
  )
    .load()
    .then((font) => {
      document.fonts.add(font);
    })
    .catch((error) => {
      loadedFonts.delete(name);
      throw error;
    });
  loadedFonts.set(name, promise);
  return promise;
}
export function ensureFonts(design: Design): Promise<void[]> {
  return Promise.all([loadFont("Mono"), loadFont(design.titleFont)]);
}
export const fontsReady = Promise.all([loadFont("Display"), loadFont("Mono")]);

const backgroundCache = new Map<string, HTMLCanvasElement>();
function background(design: Design): HTMLCanvasElement {
  const key = [
    design.color,
    design.highlight,
    design.background,
    design.positionX,
    design.positionY,
    design.spread,
    design.strength,
  ].join();
  const cached = backgroundCache.get(key);
  if (cached) {
    backgroundCache.delete(key);
    backgroundCache.set(key, cached);
    return cached;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 640;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas rendering is unavailable.");
  context.putImageData(new ImageData(gradientPixels(design), 1280, 640), 0, 0);
  backgroundCache.set(key, canvas);
  if (backgroundCache.size > 3) {
    const oldest = backgroundCache.keys().next().value;
    if (oldest !== undefined) backgroundCache.delete(oldest);
  }
  return canvas;
}

let iconFillKey = "";
let iconFillCache: HTMLCanvasElement;
function iconFill(design: Design): HTMLCanvasElement {
  const key = [design.color, design.highlight, design.background].join();
  if (key === iconFillKey) return iconFillCache;
  const canvas = document.createElement("canvas");
  canvas.width = 154;
  canvas.height = 69;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable.");
  const pixels = context.createImageData(154, 69);
  const base = rgb(design.background),
    accent = rgb(design.color),
    highlight = rgb(design.highlight);
  for (let y = 0; y < 69; y++)
    for (let x = 0; x < 154; x++) {
      const a = sampleMesh(iconMesh, (x / 153) * 28, (y / 68) * 12, 0);
      const b = sampleMesh(iconMesh, (x / 153) * 28, (y / 68) * 12, 1);
      const offset = (y * 154 + x) * 4;
      for (let c = 0; c < 3; c++)
        pixels.data[offset + c] =
          base[c] + a * (accent[c] - base[c]) + b * (highlight[c] - base[c]);
      pixels.data[offset + 3] = 255;
    }
  context.putImageData(pixels, 0, 0);
  iconFillKey = key;
  iconFillCache = canvas;
  return canvas;
}

function mark(
  context: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  size: number,
  design: Design,
): void {
  const path = paths.get(name);
  if (!path) return;
  context.save();
  context.translate(x, y);
  context.scale(size / 24, size / 24);
  context.clip(path);
  context.drawImage(
    iconFill(design),
    ((91 - x) * 24) / size,
    ((104 - y) * 24) / size,
    (154 * 24) / size,
    (69 * 24) / size,
  );
  context.restore();
}

function drawLanguage(context: CanvasRenderingContext2D, design: Design): void {
  if (!design.showLanguage || !design.language) return;
  const x = 1149,
    y = 517,
    size = 53;
  const name = languageLogos[design.language];
  const path = name ? paths.get(name) : undefined;
  if (path) {
    context.save();
    context.translate(x, y);
    context.scale(size / 24, size / 24);
    const fill = context.createLinearGradient(0, 24, 24, 0);
    const dark = rgb(design.background),
      pale = rgb(design.highlight);
    fill.addColorStop(
      0,
      `rgb(${dark.map((v, i) => Math.round(v * 0.7 + pale[i] * 0.3)).join(",")})`,
    );
    fill.addColorStop(1, design.background);
    context.fillStyle = fill;
    context.fill(path);
    context.restore();
  } else {
    context.font = "700 22px Display";
    context.textAlign = "right";
    context.fillStyle = design.background;
    context.fillText(design.language, 1202, 562, 180);
    context.textAlign = "left";
  }
}

export type RenderInfo = { lines: string[]; fontSize: number };

export function render(
  canvas: HTMLCanvasElement,
  design: Design = defaultDesign,
  scale = 1,
): RenderInfo {
  if (canvas.width !== 1280 * scale) canvas.width = 1280 * scale;
  if (canvas.height !== 640 * scale) canvas.height = 640 * scale;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser does not support canvas.");
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.drawImage(background(design), 0, 0);
  mark(context, "git", 91, 104, 68, design);
  mark(context, "github", 178, 104, 66, design);
  context.fillStyle = design.text;
  let size = design.fontSize;
  const setFont = () => {
    context.font = `700 ${size * (design.titleFont === "Display" ? 127.375 / 128 : 1)}px ${design.titleFont}`;
    context.letterSpacing = `${(design.tracking * size) / 128}px`;
  };
  setFont();
  // Fit a long word before wrapping so names never end with a two-letter orphan.
  const words = (design.title || "repository")
    .split(/[-_\s]+/u)
    .filter(Boolean);
  while (
    words.some((word) => context.measureText(word).width > 930) &&
    size > 32
  ) {
    size -= 1;
    setFont();
  }
  let lines = titleLines(
    design.title || "repository",
    (text) => context.measureText(text).width,
    930,
  );
  while (lines.length > 2 && size > 32) {
    size -= 1;
    setFont();
    lines = titleLines(
      design.title || "repository",
      (text) => context.measureText(text).width,
      930,
    );
  }
  const leading = size * 0.86;
  const baseline = 543.5;
  const first = baseline - (lines.length - 1) * leading;
  lines.forEach((line, index) =>
    context.fillText(line, 90.5, first + index * leading),
  );
  if (design.showOwner && design.owner) {
    context.font = "400 32.5px Mono";
    context.letterSpacing = "-0.75px";
    context.fillText(
      design.owner.replace(/\/$/, "") + "/",
      90.25,
      first - size * 0.90234375 - (lines.length - 1) * 8,
      940,
    );
  }
  drawLanguage(context, design);
  return { lines, fontSize: size };
}

export async function pngBlob(design: Design, scale: number): Promise<Blob> {
  await ensureFonts(design);
  if (![1, 2, 4].includes(scale))
    throw new Error("Choose a supported PNG resolution.");
  const canvas = document.createElement("canvas");
  render(canvas, design, scale);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("PNG export failed.")),
      "image/png",
    ),
  );
}
