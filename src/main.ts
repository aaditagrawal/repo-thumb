import "./style.css";
import {
  defaultDesign,
  designFor,
  generateColors,
  languageLogos,
  palettes,
  parseRepository,
} from "./model";
import type { Design } from "./model";
import { fetchRepository } from "./github";
import { ensureFonts, fontsReady, pngBlob, render } from "./renderer";
import { browserLibrary } from "./lib/library";
import {
  decodeDesign,
  downloadBlob,
  encodeDesign,
  imageFilename,
  MAX_RECIPE_BYTES,
  parseRecipe,
  serializeRecipe,
} from "./lib/recipes";
import { button, element, input, toast } from "./ui/dom";
import { renderLibrary } from "./ui/library";
import { setupScrollCue } from "./ui/scroll-cue";

const library = browserLibrary();
const canvas = element("preview", HTMLCanvasElement);
const repoInput = input("repository");
const repoStatus = element("repo-status", HTMLParagraphElement);
const languageSelect = element("language", HTMLSelectElement);
const fontSelect = element("titleFont", HTMLSelectElement);
const downloadButton = button("download-button");
const manualButton = button("manual-button");
const saveStatus = element("save-status", HTMLSpanElement);
const libraryElement = element("library", HTMLDivElement);
const paletteList = element("palettes", HTMLDivElement);
const numberSettings = [
  "positionX",
  "positionY",
  "spread",
  "strength",
  "fontSize",
  "tracking",
] as const;
const colorSettings = ["color", "highlight", "background", "text"] as const;
let design: Design = library.active ?? { ...defaultDesign };
let renderVersion = 0;
let frame = 0;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let requestVersion = 0;
let requestController: AbortController | undefined;
let exporting = false;
let disposed = false;
let loadingRepository = false;

const linked = new URLSearchParams(location.hash.slice(1)).get("design");
if (linked) {
  try {
    design = decodeDesign(linked);
  } catch (error) {
    toast(
      error instanceof Error
        ? error.message
        : "This design link could not be read.",
    );
  }
}
for (const language of Object.keys(languageLogos)) {
  const option = document.createElement("option");
  option.value = language;
  option.textContent = language;
  languageSelect.append(option);
}
for (const palette of palettes) {
  const control = document.createElement("button");
  control.type = "button";
  control.className = "palette";
  control.style.setProperty(
    "--swatch",
    `linear-gradient(125deg, ${palette.color}, ${palette.highlight})`,
  );
  control.setAttribute("aria-label", `${palette.name} gradient`);
  control.title = palette.name;
  control.addEventListener("click", () => {
    design.color = palette.color;
    design.highlight = palette.highlight;
    updateControls();
    scheduleRender();
  });
  paletteList.append(control);
}

function updateLabels(): void {
  for (const key of numberSettings) {
    element(`${key}-value`, HTMLOutputElement).value =
      `${Math.round(design[key] * 10) / 10}${key === "fontSize" || key === "tracking" ? " px" : "%"}`;
  }
  const chosen = palettes.findIndex(
    (palette) =>
      palette.color.toLowerCase() === design.color.toLowerCase() &&
      palette.highlight.toLowerCase() === design.highlight.toLowerCase(),
  );
  element("palette-name", HTMLSpanElement).textContent =
    chosen < 0 ? "Custom" : palettes[chosen].name;
  Array.from(paletteList.children).forEach((control, index) =>
    control.setAttribute("aria-pressed", String(index === chosen)),
  );
  canvas.setAttribute(
    "aria-label",
    `${design.owner}/${design.title} thumbnail${design.showLanguage && design.language ? ` with ${design.language} logo` : ""}`,
  );
}

function updateControls(): void {
  repoInput.value = design.repository;
  input("title").value = design.title;
  input("owner").value = design.owner;
  input("title").removeAttribute("aria-invalid");
  input("title").setCustomValidity("");
  element("title-error", HTMLParagraphElement).hidden = true;
  if (
    design.language &&
    !Array.from(languageSelect.options).some(
      (option) => option.value === design.language,
    )
  ) {
    const option = document.createElement("option");
    option.value = design.language;
    option.textContent = design.language;
    languageSelect.append(option);
  }
  languageSelect.value = design.language;
  fontSelect.value = design.titleFont;
  for (const key of numberSettings) input(key).value = String(design[key]);
  for (const key of colorSettings) {
    input(key).value = design[key];
    input(`${key}-hex`).value = design[key];
  }
  input("showOwner").checked = design.showOwner;
  input("showLanguage").checked = design.showLanguage;
  updateLabels();
}

function refreshLibrary(): void {
  const entries = library.list();
  renderLibrary(
    libraryElement,
    entries,
    design.repository,
    (next) => {
      changeDesign(next);
    },
    (next) => {
      if (next.repository.toLowerCase() === design.repository.toLowerCase()) {
        clearTimeout(saveTimer);
        saveTimer = undefined;
        saveStatus.textContent = "Not saved";
      }
      library.remove(next.repository);
      refreshLibrary();
      toast("Saved design removed.");
    },
  );
  element("design-count", HTMLSpanElement).textContent = entries.length
    ? `${entries.length} saved locally`
    : "In this browser";
}

function persist(): void {
  saveTimer = undefined;
  library.save(design);
  refreshLibrary();
  saveStatus.textContent = library.available
    ? "Saved locally"
    : "Export a recipe to save";
}

function scheduleRender(save = true): void {
  renderVersion++;
  updateLabels();
  downloadButton.disabled = true;
  if (!frame)
    frame = requestAnimationFrame(() => {
      frame = 0;
      const version = renderVersion,
        snapshot = { ...design };
      void ensureFonts(snapshot)
        .then(() => {
          if (version !== renderVersion || disposed) return;
          const info = render(canvas, snapshot);
          element("render-status", HTMLSpanElement).textContent =
            `1280 × 640 · PNG${info.fontSize < snapshot.fontSize ? " · Auto-fit" : ""}`;
          downloadButton.disabled = exporting;
        })
        .catch(() => {
          if (version === renderVersion)
            toast(
              "The artwork font could not load. Reload the page to try again.",
            );
        });
    });
  if (save) {
    clearTimeout(saveTimer);
    saveStatus.textContent = "Saving…";
    saveTimer = setTimeout(persist, 450);
  }
}

function setRepositoryStatus(message = "", error = false): void {
  repoStatus.hidden = !message;
  repoStatus.textContent = message;
  repoStatus.className = `field-hint${error ? " error" : ""}`;
  repoInput.setAttribute("aria-invalid", String(error));
}

function cancelRequest(): void {
  requestVersion++;
  requestController?.abort();
  loadingRepository = false;
  button("load-button").disabled = false;
  repoInput.disabled = false;
}

function changeDesign(next: Design): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    persist();
  }
  cancelRequest();
  design = { ...next };
  updateControls();
  setRepositoryStatus();
  manualButton.hidden = true;
  scheduleRender();
  if (location.hash)
    history.replaceState(null, "", location.pathname + location.search);
}

async function loadRepository(): Promise<void> {
  if (loadingRepository) return;
  let repository: string;
  try {
    repository = parseRepository(repoInput.value);
  } catch (error) {
    setRepositoryStatus(
      error instanceof Error ? error.message : "Enter owner/repository.",
      true,
    );
    manualButton.hidden = true;
    return;
  }
  const request = ++requestVersion;
  requestController?.abort();
  requestController = new AbortController();
  loadingRepository = true;
  button("load-button").disabled = true;
  repoInput.disabled = true;
  manualButton.hidden = true;
  setRepositoryStatus("Loading repository…");
  try {
    const data = await fetchRepository(repository, requestController.signal);
    if (request !== requestVersion || disposed) return;
    changeDesign(
      library.get(data.full_name) ??
        designFor(data.full_name, data.language ?? ""),
    );
  } catch (error) {
    if (request !== requestVersion || disposed) return;
    setRepositoryStatus(
      error instanceof Error && error.name !== "TimeoutError"
        ? error.message
        : "GitHub took too long. Try again or enter the details manually.",
      true,
    );
    manualButton.hidden = false;
  } finally {
    if (request === requestVersion) {
      loadingRepository = false;
      button("load-button").disabled = false;
      repoInput.disabled = false;
    }
  }
}

element("repository-form", HTMLFormElement).addEventListener(
  "submit",
  (event) => {
    event.preventDefault();
    void loadRepository();
  },
);
manualButton.addEventListener("click", () => {
  try {
    const repository = parseRepository(repoInput.value);
    changeDesign(library.get(repository) ?? designFor(repository));
  } catch (error) {
    setRepositoryStatus(
      error instanceof Error ? error.message : "Enter owner/repository.",
      true,
    );
  }
});
input("title").addEventListener("input", (event) => {
  if (!(event.target instanceof HTMLInputElement)) return;
  const valid = Boolean(event.target.value.trim());
  event.target.setCustomValidity(valid ? "" : "Enter a repository name.");
  event.target.setAttribute("aria-invalid", String(!valid));
  element("title-error", HTMLParagraphElement).hidden = valid;
  if (valid) {
    design.title = event.target.value;
    scheduleRender();
  }
});
input("owner").addEventListener("input", () => {
  design.owner = input("owner").value;
  scheduleRender();
});
languageSelect.addEventListener("input", () => {
  design.language = languageSelect.value;
  scheduleRender();
});
fontSelect.addEventListener("input", () => {
  const font = fontSelect.value;
  if (font === "Display" || font === "Geist" || font === "Inter") {
    design.titleFont = font;
    scheduleRender();
  }
});
for (const key of numberSettings)
  input(key).addEventListener("input", () => {
    design[key] = input(key).valueAsNumber;
    scheduleRender();
  });
for (const key of ["showOwner", "showLanguage"] as const)
  input(key).addEventListener("input", () => {
    design[key] = input(key).checked;
    scheduleRender();
  });
for (const key of colorSettings) {
  const color = input(key),
    hex = input(`${key}-hex`);
  color.addEventListener("input", () => {
    design[key] = color.value;
    hex.value = color.value;
    scheduleRender();
  });
  hex.addEventListener("input", () => {
    const valid = /^#[\da-f]{6}$/i.test(hex.value);
    hex.setAttribute("aria-invalid", String(!valid));
    if (valid) {
      design[key] = hex.value;
      color.value = hex.value;
      scheduleRender();
    }
  });
  hex.addEventListener("blur", () => {
    hex.value = design[key];
    hex.removeAttribute("aria-invalid");
  });
}

button("randomize-button").addEventListener("click", () => {
  const colors = generateColors(
    `${design.repository}:${crypto.getRandomValues(new Uint32Array(1))[0]}`,
  );
  design.color = colors.color;
  design.highlight = colors.highlight;
  updateControls();
  scheduleRender();
});
button("reset-button").addEventListener("click", () => {
  changeDesign(designFor(design.repository, design.language));
  toast("Design reset.");
});

downloadButton.addEventListener("click", async () => {
  if (exporting) return;
  const snapshot = { ...design },
    scale = Number(element("export-scale", HTMLSelectElement).value);
  exporting = true;
  downloadButton.disabled = true;
  const label = downloadButton.querySelector("span");
  if (label) label.textContent = "Exporting…";
  try {
    downloadBlob(
      await pngBlob(snapshot, scale),
      imageFilename(snapshot, scale),
    );
    toast(`${1280 * scale} × ${640 * scale} PNG downloaded.`);
  } catch (error) {
    toast(error instanceof Error ? error.message : "Export failed. Try again.");
  } finally {
    exporting = false;
    downloadButton.disabled = false;
    if (label) label.textContent = "Download PNG";
  }
});
button("recipe-button").addEventListener("click", () =>
  downloadBlob(
    new Blob([serializeRecipe(design)], { type: "application/json" }),
    `${design.repository.split("/")[1]}.repo-thumb.json`,
  ),
);
button("import-button").addEventListener("click", () =>
  input("recipe-file").click(),
);
input("recipe-file").addEventListener("change", async (event) => {
  if (!(event.target instanceof HTMLInputElement)) return;
  const picker = event.target,
    file = picker.files?.[0];
  if (!file) return;
  try {
    if (file.size > MAX_RECIPE_BYTES)
      throw new Error("Choose a recipe under 20 KB.");
    changeDesign(parseRecipe(await file.text()));
    toast("Recipe imported.");
  } catch (error) {
    toast(
      error instanceof Error
        ? error.message
        : "This recipe could not be imported.",
    );
  } finally {
    picker.value = "";
  }
});
button("share-button").addEventListener("click", async () => {
  const url = new URL(location.href);
  url.hash = new URLSearchParams({ design: encodeDesign(design) }).toString();
  try {
    await navigator.clipboard.writeText(url.toString());
    toast("Design link copied.");
  } catch {
    history.replaceState(null, "", url);
    toast("Copy the design link from your address bar.");
  }
});

window.addEventListener("pagehide", () => {
  disposed = true;
  cancelAnimationFrame(frame);
  frame = 0;
  requestController?.abort();
  if (saveTimer) {
    clearTimeout(saveTimer);
    persist();
  }
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    disposed = false;
    scheduleRender(false);
  }
});

updateControls();
refreshLibrary();
setupScrollCue();
void fontsReady
  .then(() => scheduleRender(false))
  .catch(() =>
    toast("The artwork fonts could not load. Reload the page to try again."),
  );
