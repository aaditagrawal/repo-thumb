import type { Design } from "../model";

/** Small CSS swatches avoid rendering full 1280px images for offscreen saved designs. */
export function renderLibrary(
  container: HTMLElement,
  designs: Design[],
  active: string,
  select: (design: Design) => void,
  remove: (design: Design) => void,
): void {
  const focused = document.activeElement;
  const focusedAction =
    focused instanceof HTMLButtonElement && container.contains(focused)
      ? focused.getAttribute("aria-label")
      : null;
  const fragment = document.createDocumentFragment();
  for (const design of designs) {
    const row = document.createElement("div");
    row.className = "library-row";
    const open = document.createElement("button");
    open.type = "button";
    open.className = "library-item";
    open.setAttribute("aria-label", `Open saved ${design.repository} design`);
    if (design.repository.toLowerCase() === active.toLowerCase())
      open.setAttribute("aria-current", "true");
    const swatch = document.createElement("span");
    swatch.className = "library-swatch";
    swatch.setAttribute("aria-hidden", "true");
    swatch.style.setProperty("--swatch-color", design.color);
    swatch.style.setProperty("--swatch-highlight", design.highlight);
    const miniature = document.createElement("span");
    miniature.textContent = design.title;
    swatch.append(miniature);
    const copy = document.createElement("span");
    copy.className = "library-copy";
    const name = document.createElement("span");
    name.className = "library-name";
    name.textContent = design.title;
    const owner = document.createElement("span");
    owner.className = "library-owner";
    owner.textContent = design.owner;
    copy.append(name, owner);
    const language = document.createElement("span");
    language.className = "library-language";
    language.textContent = design.language || "—";
    const arrow = document.createElement("span");
    arrow.className = "library-arrow";
    arrow.setAttribute("aria-hidden", "true");
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("class", "arrow-icon");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#arrow-up-right");
    icon.append(use);
    arrow.append(icon);
    open.append(swatch, copy, language, arrow);
    open.addEventListener("click", () => select(design));
    const erase = document.createElement("button");
    erase.type = "button";
    erase.className = "remove-design";
    erase.textContent = "×";
    erase.setAttribute(
      "aria-label",
      `Remove saved ${design.repository} design`,
    );
    erase.title = "Remove saved design";
    erase.addEventListener("click", () => remove(design));
    row.append(open, erase);
    fragment.append(row);
  }
  if (!designs.length) {
    const empty = document.createElement("p");
    empty.className = "empty-library";
    empty.textContent = "Your designs will appear here as you create them.";
    fragment.append(empty);
  }
  container.replaceChildren(fragment);
  if (focusedAction)
    Array.from(container.querySelectorAll("button"))
      .find((control) => control.getAttribute("aria-label") === focusedAction)
      ?.focus({ preventScroll: true });
}
