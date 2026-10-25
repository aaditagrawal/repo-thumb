import { parseRepository } from "./model";

export type Repository = {
  full_name: string;
  language: string | null;
  description: string | null;
  html_url: string;
};

export async function fetchRepository(
  input: string,
  signal?: AbortSignal,
): Promise<Repository> {
  const repository = parseRepository(input);
  const response = await fetch(`https://api.github.com/repos/${repository}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2026-03-10",
    },
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
      : AbortSignal.timeout(15000),
  });
  if (response.status === 404)
    throw new Error(
      "Repository not found or private. Check the name, or use the manual editor below.",
    );
  if (response.status === 403 || response.status === 429) {
    const reset = response.headers.get("x-ratelimit-reset");
    const time = reset
      ? new Date(Number(reset) * 1000).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
    throw new Error(
      `GitHub’s request limit has been reached${time ? ` until ${time}` : ""}. You can still create the thumbnail manually.`,
    );
  }
  if (!response.ok)
    throw new Error(
      "GitHub could not load this repository. Try again or edit the details manually.",
    );
  const data: unknown = await response.json();
  if (
    !data ||
    typeof data !== "object" ||
    !("full_name" in data) ||
    typeof data.full_name !== "string"
  )
    throw new Error("GitHub returned incomplete repository data.");
  let language =
    "language" in data && typeof data.language === "string"
      ? data.language
      : null;
  if (
    !language &&
    "parent" in data &&
    data.parent &&
    typeof data.parent === "object" &&
    "language" in data.parent &&
    typeof data.parent.language === "string"
  ) {
    language = data.parent.language;
  }
  return {
    full_name: parseRepository(data.full_name),
    language,
    description:
      "description" in data && typeof data.description === "string"
        ? data.description
        : null,
    html_url: `https://github.com/${parseRepository(data.full_name)}`,
  };
}
