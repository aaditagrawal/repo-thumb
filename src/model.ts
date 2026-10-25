export type TitleFont = "Display" | "Geist" | "Inter";

export type Design = {
  repository: string;
  owner: string;
  title: string;
  language: string;
  color: string;
  highlight: string;
  background: string;
  text: string;
  positionX: number;
  positionY: number;
  spread: number;
  strength: number;
  fontSize: number;
  tracking: number;
  titleFont: TitleFont;
  showLanguage: boolean;
  showOwner: boolean;
};

export const palettes = [
  { name: "Glacier", color: "#34e1f8", highlight: "#c5f8ff" },
  { name: "Solar", color: "#ffbd3d", highlight: "#fff393" },
  { name: "Iris", color: "#a792ff", highlight: "#ece3ff" },
  { name: "Fern", color: "#64d69a", highlight: "#d4f9c5" },
  { name: "Rose", color: "#f2809d", highlight: "#ffdfde" },
  { name: "Cobalt", color: "#638fff", highlight: "#c4e6ff" },
];

function hashSeed(value: string): number {
  return Array.from(value.toLowerCase()).reduce(
    (total, c) => (total * 31 + c.charCodeAt(0)) >>> 0,
    0,
  );
}

function hslHex(hue: number, saturation: number, lightness: number): string {
  const h = (((hue % 360) + 360) % 360) / 30;
  const s = saturation / 100,
    l = lightness / 100;
  const a = s * Math.min(l, 1 - l);
  return (
    "#" +
    [0, 8, 4]
      .map((offset) => {
        const k = (offset + h) % 12;
        return Math.round(
          255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))),
        )
          .toString(16)
          .padStart(2, "0");
      })
      .join("")
  );
}

export function generateColors(seed: string): {
  color: string;
  highlight: string;
} {
  const hash = hashSeed(seed);
  const hue = hash % 360;
  const shifts = [-75, -42, -22, 28, 55, 95, 145, 190];
  const shift = shifts[(hash >>> 8) % shifts.length];
  return {
    color: hslHex(hue, 68 + ((hash >>> 12) % 29), 57 + ((hash >>> 16) % 14)),
    highlight: hslHex(
      hue + shift,
      65 + ((hash >>> 20) % 30),
      81 + ((hash >>> 24) % 9),
    ),
  };
}

export const defaultDesign: Design = {
  repository: "aaditagrawal/fc-menu",
  owner: "aaditagrawal",
  title: "fc-menu",
  language: "TypeScript",
  color: "#34e1f8",
  highlight: "#c5f8ff",
  background: "#0f0f0f",
  text: "#d0d0d0",
  positionX: 78.125,
  positionY: 42.1875,
  spread: 100,
  strength: 100,
  fontSize: 128,
  tracking: -4,
  titleFont: "Display",
  showLanguage: true,
  showOwner: true,
};

export function parseRepository(input: string): string {
  let value = input.trim();
  if (/^(?:https?:\/\/)?(?:www\.)?github\.com\//i.test(value)) {
    const url = new URL(
      /^https?:\/\//i.test(value) ? value : `https://${value}`,
    );
    value = url.pathname.split("/").filter(Boolean).slice(0, 2).join("/");
  } else if (value.includes("://")) {
    throw new Error("Enter a github.com URL or an owner/repository name.");
  }
  value = value.replace(/\/$/, "").replace(/\.git$/i, "");
  const parts = value.split("/");
  if (
    parts.length !== 2 ||
    !/^[a-z\d](?:[a-z\d-]{0,38})$/i.test(parts[0]) ||
    !/^[a-z\d._-]{1,100}$/i.test(parts[1]) ||
    /^\.+$/.test(parts[1])
  ) {
    throw new Error("Use owner/repository, for example aaditagrawal/fc-menu.");
  }
  return value;
}

export function designFor(repository: string, language = ""): Design {
  const [owner, title] = repository.split("/");
  const palette =
    repository.toLowerCase() === "aaditagrawal/fc-menu"
      ? palettes[0]
      : repository.toLowerCase() === "aaditagrawal/zhiyun-light-control"
        ? palettes[1]
        : generateColors(repository);
  return {
    ...defaultDesign,
    color: palette.color,
    highlight: palette.highlight,
    repository,
    owner,
    title,
    language,
  };
}

const numericLimits: Record<string, [number, number]> = {
  positionX: [20, 110],
  positionY: [-20, 120],
  spread: [40, 180],
  strength: [0, 140],
  fontSize: [48, 180],
  tracking: [-6, 6],
};

export function validateDesign(value: unknown): Design {
  if (!value || typeof value !== "object")
    throw new Error("This is not a thumbnail recipe.");
  const record = Object.fromEntries(Object.entries(value));
  if (typeof record.repository !== "string")
    throw new Error("The recipe needs a repository.");
  const repository = parseRepository(record.repository);
  const design = designFor(repository);
  for (const key of ["owner", "title", "language"] as const) {
    if (typeof record[key] === "string")
      design[key] = record[key].slice(0, key === "title" ? 140 : 80);
  }
  if (!design.title.trim()) throw new Error("Give the thumbnail a title.");
  for (const key of ["color", "highlight", "background", "text"] as const) {
    if (typeof record[key] === "string" && /^#[\da-f]{6}$/i.test(record[key]))
      design[key] = record[key];
  }
  for (const key of [
    "positionX",
    "positionY",
    "spread",
    "strength",
    "fontSize",
    "tracking",
  ] as const) {
    const n = record[key];
    if (typeof n === "number" && Number.isFinite(n))
      design[key] = Math.max(
        numericLimits[key][0],
        Math.min(numericLimits[key][1], n),
      );
  }
  for (const key of ["showLanguage", "showOwner"] as const)
    if (typeof record[key] === "boolean") design[key] = record[key];
  if (
    record.titleFont === "Display" ||
    record.titleFont === "Geist" ||
    record.titleFont === "Inter"
  )
    design.titleFont = record.titleFont;
  return design;
}

export const languageLogos: Record<string, string> = {
  TypeScript: "typescript",
  JavaScript: "javascript",
  Python: "python",
  Rust: "rust",
  Swift: "swift",
  Kotlin: "kotlin",
  Go: "go",
  "C++": "cplusplus",
  C: "c",
  HTML: "html5",
  CSS: "css",
  Ruby: "ruby",
  PHP: "php",
  Dart: "dart",
  Elixir: "elixir",
  Haskell: "haskell",
  Lua: "lua",
  Shell: "gnubash",
  "Jupyter Notebook": "jupyter",
  Vue: "vuedotjs",
  Svelte: "svelte",
  Astro: "astro",
  Java: "java",
  "C#": "csharp",
  Zig: "zig",
  R: "r",
  Typst: "typst",
  Nix: "nixos",
  Julia: "julia",
  Clojure: "clojure",
  Scala: "scala",
  OCaml: "ocaml",
  Perl: "perl",
  Fortran: "fortran",
  Gleam: "gleam",
  MATLAB: "matlab",
};

export function titleLines(
  text: string,
  measure: (value: string) => number,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    const tokens = paragraph.split(/(?=[-_])|(?<=\s)/u).filter(Boolean);
    for (const token of tokens) {
      if (line && measure(line + token) > maxWidth) {
        lines.push(line.trimEnd());
        line = "";
      }
      for (const character of token) {
        if (line && measure(line + character) > maxWidth) {
          lines.push(line.trimEnd());
          line = "";
        }
        line += character;
      }
    }
    lines.push(line.trimEnd());
  }
  return lines;
}
