import { expect, test } from "bun:test";
import { defaultDesign } from "../model";
import {
  decodeDesign,
  encodeDesign,
  imageFilename,
  parseRecipe,
  serializeRecipe,
} from "./recipes";

test("Unicode share links retain all settings", () => {
  const design = {
    ...defaultDesign,
    title: "こんにちは <repo> 🚀",
    owner: "café",
  };
  expect(decodeDesign(encodeDesign(design))).toEqual(design);
});
test("recipes are versioned and remain compatible with unversioned files", () => {
  expect(parseRecipe(serializeRecipe(defaultDesign))).toEqual(defaultDesign);
  expect(parseRecipe(JSON.stringify(defaultDesign))).toEqual(defaultDesign);
  expect(() =>
    parseRecipe(JSON.stringify({ ...defaultDesign, version: 2 })),
  ).toThrow("unsupported");
});
test("rejects corrupt or oversized imports before decoding", () => {
  for (const input of ["", "a".repeat(5001), "not valid!?", "%%%"])
    expect(() => decodeDesign(input)).toThrow();
  expect(() => parseRecipe("x".repeat(20_001))).toThrow("20 KB");
});
test("export filenames use validated repository identity", () => {
  expect(imageFilename(defaultDesign)).toBe("aaditagrawal-fc-menu.png");
  expect(imageFilename(defaultDesign, 2)).toBe("aaditagrawal-fc-menu@2x.png");
});
