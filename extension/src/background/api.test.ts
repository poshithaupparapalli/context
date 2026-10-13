import { describe, expect, it, vi } from "vitest";
import { ApiFailure, callServer } from "./api";

const ok = (body: unknown, status = 200) =>
  (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe("callServer", () => {
  it("posts JSON to the right endpoint and returns the body", async () => {
    const fetchImpl = vi.fn(async (url: unknown, init?: RequestInit) => {
      expect(url).toBe("http://localhost:8787/api/explain");
      expect(init?.method).toBe("POST");
      return new Response(JSON.stringify({ title: "X" }));
    }) as unknown as typeof fetch;
    expect(await callServer("http://localhost:8787", "explain", { a: 1 }, fetchImpl)).toEqual({ title: "X" });
  });

  it("explains an unreachable server", async () => {
    const fetchImpl = (async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    await expect(callServer("http://localhost:8787", "explain", {}, fetchImpl)).rejects.toMatchObject({
      error: { code: "network" },
    });
  });

  it("maps client-side timeouts", async () => {
    const fetchImpl = (async () => {
      throw new DOMException("t", "TimeoutError");
    }) as unknown as typeof fetch;
    await expect(callServer("http://x", "deepen", {}, fetchImpl)).rejects.toMatchObject({ error: { code: "timeout" } });
  });

  it("passes through structured server errors", async () => {
    const err = callServer(
      "http://x",
      "explain",
      {},
      ok({ error: { code: "not_configured", message: "Add a key." } }, 503),
    );
    await expect(err).rejects.toBeInstanceOf(ApiFailure);
    await expect(err).rejects.toMatchObject({ error: { code: "not_configured", message: "Add a key." } });
  });

  it("copes with a non-JSON error page", async () => {
    const fetchImpl = (async () => new Response("<html>Bad gateway</html>", { status: 502 })) as unknown as typeof fetch;
    await expect(callServer("http://x", "explain", {}, fetchImpl)).rejects.toMatchObject({
      error: { code: "upstream" },
    });
  });
});
