export function element<T extends HTMLElement>(
  id: string,
  constructor: { new (): T },
): T {
  const value = document.getElementById(id);
  if (!(value instanceof constructor))
    throw new Error(`Missing ${id} element.`);
  return value;
}

export const input = (id: string) => element(id, HTMLInputElement);
export const button = (id: string) => element(id, HTMLButtonElement);

let toastTimer: ReturnType<typeof setTimeout>;
export function toast(message: string): void {
  const container = element("toast", HTMLDivElement);
  container.textContent = message;
  container.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    container.hidden = true;
  }, 4_500);
}
