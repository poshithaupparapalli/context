export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

interface BaseRequest {
  model: string;
  system: string;
  messages: LLMMessage[];
  maxTokens: number;
  signal: AbortSignal;
}

export interface JsonRequest extends BaseRequest {
  /** Name for the structured output (used as the tool name for Anthropic). */
  schemaName: string;
  schemaDescription: string;
  /** JSON Schema describing the object the model must produce. */
  jsonSchema: Record<string, unknown>;
}

export type TextRequest = BaseRequest;

/**
 * The only thing the rest of the server knows about an LLM vendor.
 * To add a provider, implement this interface and register it in `index.ts`.
 */
export interface LLMProvider {
  readonly name: string;
  /** Returns a parsed JSON value; validation against the zod schema happens upstream. */
  generateJson(req: JsonRequest): Promise<unknown>;
  generateText(req: TextRequest): Promise<string>;
}
