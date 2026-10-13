import { describe, expect, it, vi } from "vitest";
import { createWikipediaVerifier, isWikipediaUrl } from "./wikipedia.js";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("wikipedia verifier", () => {
  it("returns the canonical URL reported by Wikipedia, not one we construct", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        type: "standard",
        title: "Gradient descent",
        description: "Optimization algorithm",
        content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Gradient_descent" } },
      }),
    ) as unknown as typeof fetch;
    const v = createWikipediaVerifier({ fetchImpl });
    const result = await v.verify("gradient descent");
    expect(result).toEqual({
      title: "Gradient descent",
      description: "Optimization algorithm",
      url: "https://en.wikipedia.org/wiki/Gradient_descent",
      source: "Wikipedia",
    });
  });

  it("omits missing articles, disambiguation pages and failures", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes("Missing")) return jsonResponse({}, 404);
      if (u.includes("Mercury")) return jsonResponse({ type: "disambiguation", title: "Mercury" });
      throw new Error("offline");
    }) as unknown as typeof fetch;
    const v = createWikipediaVerifier({ fetchImpl });
    expect(await v.verifyAll(["Missing page", "Mercury", "Anything"])).toEqual([]);
  });

  it("rejects URLs that are not https Wikipedia articles", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        type: "standard",
        title: "X",
        content_urls: { desktop: { page: "https://evil.example/wiki/X" } },
      }),
    ) as unknown as typeof fetch;
    const v = createWikipediaVerifier({ fetchImpl });
    expect(await v.verify("X")).toBeNull();
    expect(isWikipediaUrl("http://en.wikipedia.org/wiki/X")).toBe(false);
    expect(isWikipediaUrl("https://en.wikipedia.org/wiki/X")).toBe(true);
  });

  it("dedupes titles that resolve to the same article", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        type: "standard",
        title: "Existentialism",
        content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Existentialism" } },
      }),
    ) as unknown as typeof fetch;
    const v = createWikipediaVerifier({ fetchImpl });
    const out = await v.verifyAll(["Existentialism", "existentialist philosophy"]);
    expect(out).toHaveLength(1);
  });
});
