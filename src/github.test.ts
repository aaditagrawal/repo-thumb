import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { fetchRepository } from "./github";
afterEach(() => {
  mock.restore();
});

describe("repository loading", () => {
  test("keeps a request deadline even when the caller supplies cancellation", async () => {
    const controller = new AbortController();
    const request = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ full_name: "owner/project", language: null }),
      ),
    );
    await fetchRepository("owner/project", controller.signal);
    const requestSignal = request.mock.calls[0]?.[1]?.signal;
    expect(requestSignal).not.toBe(controller.signal);
    expect(requestSignal?.aborted).toBe(false);
    controller.abort();
    expect(requestSignal?.aborted).toBe(true);
  });
  test("uses the source language when GitHub has not classified a fork", async () => {
    spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          full_name: "owner/fork",
          language: null,
          parent: { language: "TypeScript" },
        }),
      ),
    );
    expect((await fetchRepository("owner/fork")).language).toBe("TypeScript");
  });
  test("reads canonical repository name and primary language", async () => {
    spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          full_name: "Owner/Project",
          language: "Rust",
          description: null,
        }),
      ),
    );
    expect(await fetchRepository("owner/project")).toEqual({
      full_name: "Owner/Project",
      language: "Rust",
      description: null,
      html_url: "https://github.com/Owner/Project",
    });
  });
  test("handles repositories without a language", async () => {
    spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ full_name: "owner/project", language: null }),
      ),
    );
    expect((await fetchRepository("owner/project")).language).toBeNull();
  });
  test("offers the manual editor when a repository is private or missing", async () => {
    spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("", { status: 404 }),
    );
    await expect(fetchRepository("owner/project")).rejects.toThrow(
      "manual editor",
    );
  });
  test("explains rate limiting", async () => {
    spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("", {
        status: 403,
        headers: { "x-ratelimit-reset": "1792780800" },
      }),
    );
    await expect(fetchRepository("owner/project")).rejects.toThrow(
      "request limit",
    );
  });
  test("rejects incomplete API data", async () => {
    spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
    await expect(fetchRepository("owner/project")).rejects.toThrow(
      "incomplete",
    );
  });
});
