import { beforeEach, describe, expect, it, vi } from "vitest";
import { cacheClear, cacheGet, cacheKeyFor, cacheSet } from "./cache";

let store: Record<string, unknown> = {};
beforeEach(() => {
  store = {};
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: async (key: string) => ({ [key]: store[key] }),
        set: async (items: Record<string, unknown>) => void Object.assign(store, items),
        remove: async (key: string) => void delete store[key],
      },
    },
  });
});

describe("cache", () => {
  it("returns what was stored and expires it after two weeks", async () => {
    await cacheSet("k", { a: 1 }, 1_000);
    expect(await cacheGet("k", 2_000)).toEqual({ a: 1 });
    expect(await cacheGet("k", 1_000 + 15 * 24 * 3600 * 1000)).toBeUndefined();
  });

  it("evicts the oldest entries beyond the cap", async () => {
    for (let i = 0; i < 130; i++) await cacheSet(`k${i}`, i, i);
    expect(await cacheGet("k0", 200)).toBeUndefined();
    expect(await cacheGet("k129", 200)).toBe(129);
  });

  it("survives concurrent writes", async () => {
    await Promise.all(Array.from({ length: 20 }, (_, i) => cacheSet(`c${i}`, i, i)));
    for (let i = 0; i < 20; i++) expect(await cacheGet(`c${i}`, 100)).toBe(i);
  });

  it("clears everything", async () => {
    await cacheSet("k", 1);
    await cacheClear();
    expect(await cacheGet("k")).toBeUndefined();
  });
});

describe("cacheKeyFor", () => {
  const base = { selection: "Gradient Descent", paragraph: "p", url: "https://a.com/x?y=1#z" };
  it("is stable across case, whitespace, query and hash", async () => {
    const a = await cacheKeyFor("explain", base);
    const b = await cacheKeyFor("explain", { ...base, selection: " gradient   descent ", url: "https://a.com/x?other=2" });
    expect(a).toBe(b);
  });
  it("differs by operation, page and passage", async () => {
    const a = await cacheKeyFor("explain", base);
    expect(await cacheKeyFor("deepen", base)).not.toBe(a);
    expect(await cacheKeyFor("explain", { ...base, url: "https://b.com/x" })).not.toBe(a);
    expect(await cacheKeyFor("explain", { ...base, paragraph: "different" })).not.toBe(a);
  });
});
