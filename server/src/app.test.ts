import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp, isAllowedOrigin } from "./app.js";
import { createContextService } from "./services/context-service.js";
import type { JsonRequest, LLMProvider, TextRequest } from "./services/llm/types.js";
import { createWikipediaVerifier } from "./services/wikipedia.js";
import { ContextError } from "./errors.js";

const card = {
  title: "The Brothers Karamazov",
  labels: ["Literature", "Dostoevsky", "1880"],
  whatItIs: "Dostoevsky's final novel.",
  inThisPassage: "The author uses it to dramatise faith versus reason.",
  passageBasis: "inferred",
  identification: "confident",
};

const deep = {
  overview: "A novel about three brothers.",
  sections: [{ heading: "Themes", blocks: [{ type: "paragraph", text: "Faith and doubt." }] }],
  related: [{ term: "Existentialism", note: "Often linked to Dostoevsky." }],
  wikipediaTitles: ["The Brothers Karamazov", "Made Up Title"],
  originalWorks: [],
};

class FakeProvider implements LLMProvider {
  name = "fake";
  jsonCalls: JsonRequest[] = [];
  textCalls: TextRequest[] = [];
  jsonQueue: unknown[] = [];
  async generateJson(req: JsonRequest) {
    this.jsonCalls.push(req);
    const next = this.jsonQueue.shift();
    if (next instanceof Error) throw next;
    return next;
  }
  async generateText(req: TextRequest) {
    this.textCalls.push(req);
    return "  An answer.  ";
  }
}

const wikipedia = createWikipediaVerifier({
  fetchImpl: (async (url: string | URL | Request) =>
    String(url).includes("Made_Up")
      ? new Response("{}", { status: 404 })
      : new Response(
          JSON.stringify({
            type: "standard",
            title: "The Brothers Karamazov",
            content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/The_Brothers_Karamazov" } },
          }),
        )) as unknown as typeof fetch,
});

const provider = new FakeProvider();
const config = { fastModel: "fast", deepModel: "deep", timeoutMs: 5000, provider: "anthropic" as const };
let server: ReturnType<ReturnType<typeof createApp>["listen"]>;
let base = "";

beforeAll(async () => {
  const app = createApp({ config, service: createContextService({ config, provider, wikipedia }) });
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());

const readJson = async (res: Response): Promise<any> => res.json();

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

const context = { selection: "The Brothers Karamazov", paragraph: "He loved The Brothers Karamazov." };

describe("routes", () => {
  it("GET /health reports configuration", async () => {
    const json = await (await fetch(`${base}/health`)).json();
    expect(json).toMatchObject({ ok: true, configured: true, provider: "anthropic" });
  });

  it("POST /api/explain returns a validated card using the fast model", async () => {
    provider.jsonQueue.push(card);
    const res = await post("/api/explain", { context });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ title: "The Brothers Karamazov", passageBasis: "inferred" });
    expect(provider.jsonCalls.at(-1)?.model).toBe("fast");
  });

  it("repairs invalid model output once, then gives up with bad_output", async () => {
    const before = provider.jsonCalls.length;
    provider.jsonQueue.push({ title: "oops" }, card);
    const ok = await post("/api/explain", { context });
    expect(ok.status).toBe(200);
    expect(provider.jsonCalls.length - before).toBe(2);

    provider.jsonQueue.push({ nope: 1 }, { nope: 2 });
    const bad = await post("/api/explain", { context });
    expect(bad.status).toBe(502);
    expect((await readJson(bad)).error.code).toBe("bad_output");
  });

  it("POST /api/deepen keeps only Wikipedia links that were verified", async () => {
    provider.jsonQueue.push(deep);
    const res = await post("/api/deepen", { context, explanation: { title: "T", whatItIs: "W", inThisPassage: "P" } });
    const json = await readJson(res);
    expect(res.status).toBe(200);
    expect(json.verifiedSources).toEqual([
      expect.objectContaining({ url: "https://en.wikipedia.org/wiki/The_Brothers_Karamazov" }),
    ]);
    expect(json.wikipediaTitles).toBeUndefined();
    expect(provider.jsonCalls.at(-1)?.model).toBe("deep");
  });

  it("POST /api/followup returns the trimmed answer", async () => {
    const res = await post("/api/followup", {
      context,
      explanation: { title: "T", whatItIs: "W", inThisPassage: "P" },
      history: [],
      question: "Why faith?",
    });
    expect(await res.json()).toEqual({ answer: "An answer." });
    expect(provider.textCalls.at(-1)?.messages.at(-1)?.content).toContain("Why faith?");
  });

  it("clamps oversized context instead of forwarding it", async () => {
    provider.jsonQueue.push(card);
    await post("/api/explain", { context: { selection: "x".repeat(5000), paragraph: "y".repeat(50000) } });
    const sent = provider.jsonCalls.at(-1)!.messages[0]!.content;
    expect(sent.length).toBeLessThan(4000);
  });

  it("rejects malformed requests", async () => {
    const res = await post("/api/explain", { context: {} });
    expect(res.status).toBe(400);
    expect((await readJson(res)).error.code).toBe("bad_request");
  });

  it("surfaces provider failures with their code", async () => {
    provider.jsonQueue.push(new ContextError("rate_limited", "slow down"));
    const res = await post("/api/explain", { context });
    expect(res.status).toBe(429);
  });

  it("refuses requests from ordinary web pages", async () => {
    const res = await post("/api/explain", { context }, { origin: "https://evil.example" });
    expect(res.status).toBe(403);
  });

  it("answers extension preflights", async () => {
    const res = await fetch(`${base}/api/explain`, {
      method: "OPTIONS",
      headers: { origin: "chrome-extension://abcdef", "access-control-request-method": "POST" },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("chrome-extension://abcdef");
  });
});

describe("not configured", () => {
  it("returns a helpful 503", async () => {
    const cfg = { fastModel: null, deepModel: null, timeoutMs: 1000, provider: null };
    const app = createApp({ config: cfg, service: createContextService({ config: cfg, provider: null, wikipedia }) });
    const s = await new Promise<ReturnType<typeof app.listen>>((r) => {
      const srv = app.listen(0, "127.0.0.1", () => r(srv));
    });
    const res = await fetch(`http://127.0.0.1:${(s.address() as AddressInfo).port}/api/explain`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ context }),
    });
    expect(res.status).toBe(503);
    const json = await readJson(res);
    expect(json.error.code).toBe("not_configured");
    expect(json.error.message).toMatch(/server\/\.env/);
    s.close();
  });
});

describe("isAllowedOrigin", () => {
  it.each([
    [undefined, true],
    ["chrome-extension://abc", true],
    ["http://localhost:3000", true],
    ["https://example.com", false],
    ["http://localhost.evil.com", false],
  ])("%s -> %s", (origin, expected) => {
    expect(isAllowedOrigin(origin)).toBe(expected);
  });
});
