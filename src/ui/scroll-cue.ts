import { button, element } from "./dom";

export function setupScrollCue(): void {
  const cue = button("scroll-cue");
  const end = element("page-end", HTMLSpanElement);
  const observer = new IntersectionObserver(
    ([entry]) => {
      cue.hidden = entry.isIntersecting;
    },
    { rootMargin: "0px 0px -4px 0px" },
  );
  observer.observe(end);
  cue.addEventListener("click", () => {
    window.scrollBy({ top: Math.round(window.innerHeight * 0.65) });
  });
}
