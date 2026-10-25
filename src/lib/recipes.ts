import { validateDesign } from "../model";
import type { Design } from "../model";

export const MAX_RECIPE_BYTES = 20_000;

export function encodeDesign(design: Design): string {
  return btoa(
    String.fromCharCode(...new TextEncoder().encode(JSON.stringify(design))),
  )
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

export function decodeDesign(value: string): Design {
  if (!value || value.length > 5_000 || !/^[\w-]+$/.test(value))
    throw new Error("This design link could not be read.");
  try {
    const bytes = Uint8Array.from(
      atob(value.replaceAll("-", "+").replaceAll("_", "/")),
      (character) => character.charCodeAt(0),
    );
    return validateDesign(
      JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
    );
  } catch {
    throw new Error("This design link could not be read.");
  }
}

export function parseRecipe(text: string): Design {
  if (new TextEncoder().encode(text).length > MAX_RECIPE_BYTES)
    throw new Error("Choose a recipe under 20 KB.");
  const data: unknown = JSON.parse(text);
  if (
    data &&
    typeof data === "object" &&
    "version" in data &&
    data.version !== 1
  )
    throw new Error("This recipe uses an unsupported version.");
  return validateDesign(data);
}

export function serializeRecipe(design: Design): string {
  return JSON.stringify({ version: 1, ...design }, null, 2);
}

export function imageFilename(design: Design, scale = 1): string {
  const stem = design.repository
    .replaceAll("/", "-")
    .replace(/[^a-z\d._-]/gi, "-");
  return `${stem}${scale === 1 ? "" : `@${scale}x`}.png`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
