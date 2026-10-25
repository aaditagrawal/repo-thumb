import { validateDesign } from "../model";
import type { Design } from "../model";

const DESIGNS_KEY = "repo-thumb-designs-v1";
const ACTIVE_KEY = "repo-thumb-active-v1";
const MAX_DESIGNS = 30;
export type LibraryStorage = Pick<Storage, "getItem" | "setItem">;

/** Browser persistence is an optional boundary; editing also works without storage. */
export class DesignLibrary {
  private readonly designs = new Map<string, Design>();
  available = true;
  active: Design | undefined;

  constructor(private readonly storage?: LibraryStorage) {
    if (!storage) {
      this.available = false;
      return;
    }
    this.readStorage();
  }

  private readStorage(): void {
    if (!this.storage || !this.available) return;
    try {
      const saved: unknown = JSON.parse(
        this.storage.getItem(DESIGNS_KEY) ?? "[]",
      );
      const active = this.storage.getItem(ACTIVE_KEY);
      this.designs.clear();
      if (Array.isArray(saved))
        for (const value of saved.slice(-MAX_DESIGNS)) {
          try {
            const design = validateDesign(value);
            this.designs.set(design.repository.toLowerCase(), design);
          } catch {
            /* Retain valid designs if one saved entry is damaged. */
          }
        }
      this.active = active ? this.get(active) : undefined;
    } catch {
      this.available = false;
    }
  }

  get(repository: string): Design | undefined {
    const design = this.designs.get(repository.toLowerCase());
    return design ? { ...design } : undefined;
  }

  list(): Design[] {
    return [...this.designs.values()]
      .reverse()
      .map((design) => ({ ...design }));
  }

  save(design: Design): void {
    this.readStorage();
    const key = design.repository.toLowerCase();
    this.designs.delete(key);
    this.designs.set(key, { ...design });
    this.active = { ...design };
    while (this.designs.size > MAX_DESIGNS) {
      const oldest = this.designs.keys().next().value;
      if (oldest === undefined) break;
      this.designs.delete(oldest);
    }
    this.persist();
  }

  remove(repository: string): void {
    this.readStorage();
    this.designs.delete(repository.toLowerCase());
    if (this.active?.repository.toLowerCase() === repository.toLowerCase())
      this.active = undefined;
    this.persist();
  }

  private persist(): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(
        DESIGNS_KEY,
        JSON.stringify([...this.designs.values()]),
      );
      this.storage.setItem(
        ACTIVE_KEY,
        this.active?.repository.toLowerCase() ?? "",
      );
      this.available = true;
    } catch {
      this.available = false;
    }
  }
}

export function browserLibrary(): DesignLibrary {
  try {
    return new DesignLibrary(localStorage);
  } catch {
    return new DesignLibrary();
  }
}
