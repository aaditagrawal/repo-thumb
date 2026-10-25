import { describe, expect, test } from "bun:test";
import {
  defaultDesign,
  designFor,
  generateColors,
  parseRepository,
  titleLines,
  validateDesign,
} from "./model";

describe("GitHub repository input", () => {
  test.each([
    ["aaditagrawal/fc-menu", "aaditagrawal/fc-menu"],
    [" https://github.com/aaditagrawal/fc-menu/ ", "aaditagrawal/fc-menu"],
    ["github.com/owner/repo.git", "owner/repo"],
    [
      "https://github.com/owner/repo/tree/main?tab=readme-ov-file",
      "owner/repo",
    ],
    ["https://github.com/owner/repo#readme", "owner/repo"],
  ])("normalizes %s", (input, expected) => {
    expect(parseRepository(input)).toBe(expected);
  });
  test.each([
    "owner",
    "owner/repo/extra",
    "https://evil.test/owner/repo",
    "github.com.evil.test/owner/repo",
    "/repo",
    "a/..",
    "a/<script>",
    "a b/repo",
  ])("rejects %s", (input) => {
    expect(() => parseRepository(input)).toThrow();
  });
});

describe("portable design recipes", () => {
  test("round-trips all supported settings", () => {
    const value = {
      ...defaultDesign,
      title: "hello <world>",
      positionX: 61,
      color: "#123456",
      language: "C++",
      showOwner: false,
    };
    expect(validateDesign(JSON.parse(JSON.stringify(value)))).toEqual(value);
  });
  test("clamps numeric inputs and rejects invalid colors and fonts", () => {
    const value = validateDesign({
      ...defaultDesign,
      spread: 10000,
      fontSize: NaN,
      strength: -20,
      color: "url(evil)",
      titleFont: "arbitrary",
    });
    expect(value.spread).toBe(180);
    expect(value.fontSize).toBe(128);
    expect(value.strength).toBe(0);
    expect(value.color).toBe(defaultDesign.color);
    expect(value.titleFont).toBe("Display");
  });
  test("rejects malformed recipes", () => {
    for (const input of [
      null,
      [],
      "x",
      {},
      { repository: "../etc" },
      { ...defaultDesign, title: "" },
    ])
      expect(() => validateDesign(input)).toThrow();
  });
  test("keeps reference palettes and chooses deterministic repository colors", () => {
    expect(designFor("aaditagrawal/fc-menu").color).toBe("#34e1f8");
    expect(designFor("aaditagrawal/zhiyun-light-control").color).toBe(
      "#ffbd3d",
    );
    expect(designFor("other/project")).toEqual(designFor("other/project"));
  });
});

describe("long repository names", () => {
  const measure = (text: string) => text.length * 10;
  test("wraps at a hyphen and preserves every character", () => {
    expect(titleLines("zhiyun-light-control", measure, 130)).toEqual([
      "zhiyun-light",
      "-control",
    ]);
  });
  test("breaks a long unbroken name without clipping", () => {
    const text = "averylongrepositoryname";
    const lines = titleLines(text, measure, 70);
    expect(lines.join("")).toBe(text);
    expect(lines.every((line) => measure(line) <= 70)).toBe(true);
  });
  test("preserves explicit newlines and Unicode", () => {
    expect(titleLines("repo\nこんにちは", measure, 500)).toEqual([
      "repo",
      "こんにちは",
    ]);
  });
});

test("generates many distinct, portable color combinations beyond the presets", () => {
  const colors = Array.from({ length: 100 }, (_, i) =>
    generateColors(`owner/repository-${i}`),
  );
  expect(
    new Set(colors.map((value) => value.color + value.highlight)).size,
  ).toBe(100);
  expect(
    colors.every(
      (value) =>
        /^#[\da-f]{6}$/.test(value.color) &&
        /^#[\da-f]{6}$/.test(value.highlight),
    ),
  ).toBe(true);
  expect(generateColors("owner/repository")).toEqual(
    generateColors("owner/repository"),
  );
});
