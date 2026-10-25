import { describe, expect, test } from "bun:test";
import { DesignLibrary } from "./library";
import { designFor } from "../model";

function storage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe("saved designs", () => {
  test("merges saves from different tabs without restoring another tab's deletions", () => {
    const persisted = storage();
    const firstTab = new DesignLibrary(persisted);
    const secondTab = new DesignLibrary(persisted);
    firstTab.save(designFor("owner/first"));
    secondTab.save(designFor("owner/second"));
    expect(
      new DesignLibrary(persisted).list().map((design) => design.repository),
    ).toEqual(["owner/second", "owner/first"]);
    firstTab.remove("owner/second");
    secondTab.save(designFor("owner/third"));
    const reloaded = new DesignLibrary(persisted);
    expect(reloaded.get("owner/second")).toBeUndefined();
    expect(reloaded.list().map((design) => design.repository)).toEqual([
      "owner/third",
      "owner/first",
    ]);
  });
  test("preserves the existing v1 library and active repository", () => {
    const design = designFor("owner/project", "TypeScript");
    const library = new DesignLibrary(
      storage({
        "repo-thumb-designs-v1": JSON.stringify([design]),
        "repo-thumb-active-v1": "owner/project",
      }),
    );
    expect(library.active).toEqual(design);
    expect(library.get("OWNER/PROJECT")).toEqual(design);
  });
  test("keeps the newest 30 designs and returns defensive copies", () => {
    const library = new DesignLibrary(storage());
    for (let i = 0; i < 35; i++) library.save(designFor(`owner/project-${i}`));
    expect(library.list()).toHaveLength(30);
    expect(library.get("owner/project-0")).toBeUndefined();
    const item = library.list()[0];
    item.title = "changed";
    expect(library.list()[0].title).toBe("project-34");
  });
  test("ignores a damaged entry while retaining valid designs", () => {
    const good = designFor("owner/project");
    const library = new DesignLibrary(
      storage({
        "repo-thumb-designs-v1": JSON.stringify([null, { nope: true }, good]),
      }),
    );
    expect(library.list()).toEqual([good]);
  });
  test("continues in memory when browser persistence fails", () => {
    const library = new DesignLibrary({
      getItem: () => {
        throw new Error("Blocked");
      },
      setItem: () => {
        throw new Error("Quota");
      },
    });
    library.save(designFor("owner/project"));
    expect(library.available).toBe(false);
    expect(library.list()).toHaveLength(1);
  });
  test("removes the active design without resurrecting it on reload", () => {
    const persisted = storage(),
      library = new DesignLibrary(persisted);
    library.save(designFor("owner/project"));
    library.remove("owner/project");
    const reloaded = new DesignLibrary(persisted);
    expect(reloaded.active).toBeUndefined();
    expect(reloaded.list()).toHaveLength(0);
  });
});
