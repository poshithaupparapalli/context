import { describe, expect, it, vi } from "vitest";
import { ContextError } from "../../errors.js";
import { createAnthropicProvider } from "./anthropic.js";
import { createOpenAIProvider, parseJsonLoose } from "./openai.js";

const base = {
  model: "m",
  system: "sys",
  messages: [{ role: "user" as const, content: "hi" }],
  maxTokens: 100,
  signal: new AbortController().signal,
};
const jsonReq = { ...base, schemaName: "thing", schemaDescription: "d", jsonSchema: { type: "object" } };

function res(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe("openai provider", () => {
  it("sends JSON mode with the schema in the system prompt and parses the result", async () => {
    const fetchImpl = vi.fn(async (_u: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.response_format).toEqual({ type: "json_object" });
      expect(body.max_completion_tokens).toBe(100);
      expect(body.messages[0].content).toContain('"type":"object"');
      expect((init?.headers as Record<string, string>).authorization).toBe("Bearer k");
      return res({ choices: [{ message: { content: '```json\n{"a":1}\n```' } }] });
    }) as unknown as typeof fetch;
    const p = createOpenAIProvider({ apiKey: "k", baseUrl: "https://api.openai.com/v1", fetchImpl });
    expect(await p.generateJson(jsonReq)).toEqual({ a: 1 });
  });

  it("uses max_tokens for compatible servers", async () => {
    const fetchImpl = vi.fn(async (_u: unknown, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body)).max_tokens).toBe(100);
      return res({ choices: [{ message: { content: "plain" } }] });
    }) as unknown as typeof fetch;
    const p = createOpenAIProvider({ apiKey: "k", baseUrl: "http://localhost:11434/v1", fetchImpl });
    expect(await p.generateText(base)).toBe("plain");
  });

  it("maps HTTP failures to friendly error codes", async () => {
    const make = (status: number) =>
      createOpenAIProvider({
        apiKey: "k",
        baseUrl: "https://api.openai.com/v1",
        fetchImpl: (async () => res({ error: { message: "nope" } }, status)) as unknown as typeof fetch,
      });
    await expect(make(401).generateText(base)).rejects.toMatchObject({ code: "not_configured" });
    await expect(make(429).generateText(base)).rejects.toMatchObject({ code: "rate_limited" });
    await expect(make(500).generateText(base)).rejects.toMatchObject({ code: "upstream" });
  });

  it("maps aborts to timeout and other transport errors to network", async () => {
    const abort = createOpenAIProvider({
      apiKey: "k",
      baseUrl: "https://x/v1",
      fetchImpl: (async () => {
        throw new DOMException("timed out", "TimeoutError");
      }) as unknown as typeof fetch,
    });
    await expect(abort.generateText(base)).rejects.toMatchObject({ code: "timeout" });
    const down = createOpenAIProvider({
      apiKey: "k",
      baseUrl: "https://x/v1",
      fetchImpl: (async () => {
        throw new TypeError("fetch failed");
      }) as unknown as typeof fetch,
    });
    await expect(down.generateText(base)).rejects.toMatchObject({ code: "network" });
  });
});

describe("parseJsonLoose", () => {
  it("extracts an object surrounded by prose", () => {
    expect(parseJsonLoose('Sure! {"a": 2} Hope that helps')).toEqual({ a: 2 });
  });
  it("throws bad_output on garbage", () => {
    expect(() => parseJsonLoose("nope")).toThrow(ContextError);
  });
});

describe("anthropic provider", () => {
  it("forces a tool call and returns its input", async () => {
    const fetchImpl = vi.fn(async (url: unknown, init?: RequestInit) => {
      expect(String(url)).toBe("https://api.anthropic.com/v1/messages");
      const body = JSON.parse(String(init?.body));
      expect(body.tool_choice).toEqual({ type: "tool", name: "thing" });
      expect(body.tools[0].input_schema).toEqual({ type: "object" });
      expect((init?.headers as Record<string, string>)["x-api-key"]).toBe("k");
      return res({ content: [{ type: "tool_use", name: "thing", input: { ok: true } }] });
    }) as unknown as typeof fetch;
    const p = createAnthropicProvider({ apiKey: "k", baseUrl: "https://api.anthropic.com", fetchImpl });
    expect(await p.generateJson(jsonReq)).toEqual({ ok: true });
  });

  it("joins text blocks for plain answers", async () => {
    const fetchImpl = (async () =>
      res({ content: [{ type: "text", text: "Hello " }, { type: "text", text: "world" }] })) as unknown as typeof fetch;
    const p = createAnthropicProvider({ apiKey: "k", baseUrl: "https://api.anthropic.com", fetchImpl });
    expect(await p.generateText(base)).toBe("Hello world");
  });

  it("reports missing tool output as bad_output", async () => {
    const fetchImpl = (async () => res({ content: [{ type: "text", text: "no tool" }] })) as unknown as typeof fetch;
    const p = createAnthropicProvider({ apiKey: "k", baseUrl: "https://api.anthropic.com", fetchImpl });
    await expect(p.generateJson(jsonReq)).rejects.toMatchObject({ code: "bad_output" });
  });
});
