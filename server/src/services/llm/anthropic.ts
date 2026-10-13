import { ContextError } from "../../errors.js";
import { postJson } from "./http.js";
import type { JsonRequest, LLMProvider, TextRequest } from "./types.js";

export interface AnthropicOptions {
  apiKey: string;
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

export function createAnthropicProvider({ apiKey, baseUrl, fetchImpl }: AnthropicOptions): LLMProvider {
  const headers = { "x-api-key": apiKey, "anthropic-version": "2023-06-01" };

  async function messages(req: TextRequest, extra: Record<string, unknown>) {
    return postJson(
      `${baseUrl}/v1/messages`,
      headers,
      {
        model: req.model,
        max_tokens: req.maxTokens,
        system: req.system,
        messages: req.messages,
        ...extra,
      },
      req.signal,
      "The model provider",
      fetchImpl,
    );
  }

  return {
    name: "anthropic",

    async generateJson(req: JsonRequest) {
      // Forcing a single tool call is the most reliable way to get schema-shaped JSON.
      const json = await messages(req, {
        tools: [
          {
            name: req.schemaName,
            description: req.schemaDescription,
            input_schema: req.jsonSchema,
          },
        ],
        tool_choice: { type: "tool", name: req.schemaName },
      });
      const block = (json?.content ?? []).find((b: any) => b?.type === "tool_use");
      if (!block || typeof block.input !== "object" || block.input === null) {
        throw new ContextError("bad_output", "The model did not return structured output.");
      }
      return block.input;
    },

    async generateText(req: TextRequest) {
      const json = await messages(req, {});
      const text = (json?.content ?? [])
        .filter((b: any) => b?.type === "text" && typeof b.text === "string")
        .map((b: any) => b.text)
        .join("")
        .trim();
      if (!text) throw new ContextError("bad_output", "The model returned an empty response.");
      return text;
    },
  };
}
