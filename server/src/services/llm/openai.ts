import { ContextError } from "../../errors.js";
import { postJson } from "./http.js";
import type { JsonRequest, LLMProvider, TextRequest } from "./types.js";

export interface OpenAIOptions {
  apiKey: string;
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

/** OpenAI Chat Completions, and anything that speaks the same dialect. */
export function createOpenAIProvider({ apiKey, baseUrl, fetchImpl }: OpenAIOptions): LLMProvider {
  const isOfficial = /(^|\/\/)api\.openai\.com/.test(baseUrl);

  async function chat(
    req: TextRequest,
    system: string,
    extra: Record<string, unknown>,
  ): Promise<string> {
    const body = {
      model: req.model,
      messages: [{ role: "system", content: system }, ...req.messages],
      // Newer OpenAI models reject `max_tokens`; compatible servers often only know it.
      [isOfficial ? "max_completion_tokens" : "max_tokens"]: req.maxTokens,
      ...extra,
    };
    const json = await postJson(
      `${baseUrl}/chat/completions`,
      { authorization: `Bearer ${apiKey}` },
      body,
      req.signal,
      "The model provider",
      fetchImpl,
    );
    const choice = json?.choices?.[0];
    const content = choice?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new ContextError("bad_output", "The model returned an empty response.");
    }
    return content;
  }

  return {
    name: "openai",

    async generateJson(req: JsonRequest) {
      const schemaText = JSON.stringify(req.jsonSchema);
      const system = `${req.system}\n\nRespond with a single JSON object and nothing else (no markdown fences). It must conform to this JSON Schema:\n${schemaText}`;
      const content = await chat(req, system, { response_format: { type: "json_object" } });
      return parseJsonLoose(content);
    },

    generateText(req: TextRequest) {
      return chat(req, req.system, {});
    },
  };
}

/** Tolerates a stray ```json fence even though we ask for none. */
export function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim();
  const unfenced = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(unfenced);
  } catch {
    const start = unfenced.indexOf("{");
    const end = unfenced.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(unfenced.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    throw new ContextError("bad_output", "The model returned malformed JSON.");
  }
}
