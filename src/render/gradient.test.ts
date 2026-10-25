import { expect, test } from "bun:test";
import { defaultDesign } from "../model";
import { gradientPixels } from "./gradient";

test("color edits and cache eviction produce deterministic, opaque image data", () => {
  const original = gradientPixels(defaultDesign);
  expect(original.length).toBe(1280 * 640 * 4);
  for (const positionX of [30, 45, 60, 75])
    gradientPixels({ ...defaultDesign, positionX });
  expect(gradientPixels(defaultDesign)).toEqual(original);
  for (let index = 3; index < original.length; index += 4)
    if (original[index] !== 255) throw new Error("Transparent gradient pixel");
});
test("zero strength produces the chosen background at extreme positions", () => {
  const pixels = gradientPixels({
    ...defaultDesign,
    strength: 0,
    background: "#182433",
    positionX: 20,
    positionY: -20,
    spread: 40,
  });
  for (let index = 0; index < pixels.length; index += 4) {
    if (
      pixels[index] !== 24 ||
      pixels[index + 1] !== 36 ||
      pixels[index + 2] !== 51 ||
      pixels[index + 3] !== 255
    )
      throw new Error("Background changed at zero strength");
  }
});
