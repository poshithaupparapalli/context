import type { Config } from "../../config.js";
import { createAnthropicProvider } from "./anthropic.js";
import { createOpenAIProvider } from "./openai.js";
import type { LLMProvider } from "./types.js";

export type { LLMProvider, LLMMessage, JsonRequest, TextRequest } from "./types.js";

/** Returns null when no provider is configured (the server still starts and says so). */
export function createProvider(config: Config): LLMProvider | null {
  if (config.provider === "anthropic" && config.anthropicApiKey) {
    return createAnthropicProvider({
      apiKey: config.anthropicApiKey,
      baseUrl: config.anthropicBaseUrl,
    });
  }
  if (config.provider === "openai" && config.openaiApiKey) {
    return createOpenAIProvider({ apiKey: config.openaiApiKey, baseUrl: config.openaiBaseUrl });
  }
  return null;
}
