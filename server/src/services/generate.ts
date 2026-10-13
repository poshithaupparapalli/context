import { z } from "zod";
import { ContextError } from "../errors.js";
import type { JsonRequest, LLMProvider } from "./llm/types.js";

type StructuredInput = Omit<JsonRequest, "jsonSchema" | "schemaName" | "schemaDescription">;

export function toJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _ignored, ...rest } = z.toJSONSchema(schema) as Record<string, unknown>;
  return rest;
}

/**
 * Asks the provider for JSON, validates it with zod, and gives the model a
 * single chance to repair its own output before we give up.
 */
export async function generateStructured<S extends z.ZodType>(
  provider: LLMProvider,
  schema: S,
  meta: { name: string; description: string },
  input: StructuredInput,
): Promise<z.output<S>> {
  const jsonSchema = toJsonSchema(schema);
  const base = { ...input, schemaName: meta.name, schemaDescription: meta.description, jsonSchema };

  const first = await provider.generateJson(base);
  const parsed = schema.safeParse(first);
  if (parsed.success) return parsed.data;

  const issues = z.prettifyError(parsed.error).slice(0, 800);
  const retry = await provider.generateJson({
    ...base,
    messages: [
      ...input.messages,
      { role: "assistant", content: JSON.stringify(first).slice(0, 6000) },
      {
        role: "user",
        content: `That JSON did not match the required schema:\n${issues}\n\nReturn a corrected JSON object only.`,
      },
    ],
  });
  const reparsed = schema.safeParse(retry);
  if (reparsed.success) return reparsed.data;

  throw new ContextError("bad_output", "The model's answer didn't have the expected shape. Try again.");
}
