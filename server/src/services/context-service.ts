import {
  DeepModelOutputSchema,
  ExplanationSchema,
  FollowUpRequestSchema,
  type DeepResponse,
  type DeepenRequest,
  type Explanation,
  type ExplainRequest,
  type FollowUpRequest,
  type FollowUpResponse,
  DeepenRequestSchema,
  ExplainRequestSchema,
} from "@context/shared";
import type { Config } from "../config.js";
import { ContextError } from "../errors.js";
import {
  buildDeepenMessages,
  buildExplainMessages,
  buildFollowUpMessages,
} from "../prompts/builders.js";
import { DEEP_SYSTEM, EXPLAIN_SYSTEM, FOLLOWUP_SYSTEM } from "../prompts/system.js";
import { generateStructured } from "./generate.js";
import type { LLMProvider } from "./llm/types.js";
import type { WikipediaVerifier } from "./wikipedia.js";

export interface ContextServiceDeps {
  config: Pick<Config, "fastModel" | "deepModel" | "timeoutMs">;
  provider: LLMProvider | null;
  wikipedia: WikipediaVerifier;
}

export function createContextService({ config, provider, wikipedia }: ContextServiceDeps) {
  function requireProvider(): { provider: LLMProvider; fast: string; deep: string } {
    if (!provider || !config.fastModel || !config.deepModel) {
      throw new ContextError(
        "not_configured",
        "No model provider is configured. Add ANTHROPIC_API_KEY or OPENAI_API_KEY to server/.env and restart the server.",
      );
    }
    return { provider, fast: config.fastModel, deep: config.deepModel };
  }

  function signalFor(external?: AbortSignal): AbortSignal {
    const timeout = AbortSignal.timeout(config.timeoutMs);
    return external ? AbortSignal.any([timeout, external]) : timeout;
  }

  return {
    async explain(raw: ExplainRequest, external?: AbortSignal): Promise<Explanation> {
      const { context } = ExplainRequestSchema.parse(raw);
      const p = requireProvider();
      return generateStructured(
        p.provider,
        ExplanationSchema,
        { name: "explanation_card", description: "The short explanation card for the selected text." },
        {
          model: p.fast,
          system: EXPLAIN_SYSTEM,
          messages: buildExplainMessages(context),
          maxTokens: 700,
          signal: signalFor(external),
        },
      );
    },

    async deepen(raw: DeepenRequest, external?: AbortSignal): Promise<DeepResponse> {
      const { context, explanation } = DeepenRequestSchema.parse(raw);
      const p = requireProvider();
      const signal = signalFor(external);
      const output = await generateStructured(
        p.provider,
        DeepModelOutputSchema,
        { name: "deep_exploration", description: "A structured deeper exploration of the selected concept." },
        {
          model: p.deep,
          system: DEEP_SYSTEM,
          messages: buildDeepenMessages(context, explanation),
          maxTokens: 2600,
          signal,
        },
      );
      const verifiedSources = await wikipedia.verifyAll(output.wikipediaTitles.slice(0, 4));
      const { wikipediaTitles: _titles, ...rest } = output;
      return { ...rest, verifiedSources };
    },

    async followUp(raw: FollowUpRequest, external?: AbortSignal): Promise<FollowUpResponse> {
      const req = FollowUpRequestSchema.parse(raw);
      const p = requireProvider();
      const answer = await p.provider.generateText({
        model: p.deep,
        system: FOLLOWUP_SYSTEM,
        messages: buildFollowUpMessages(
          req.context,
          req.explanation,
          req.overview,
          req.history,
          req.question,
        ),
        maxTokens: 1400,
        signal: signalFor(external),
      });
      return { answer: answer.trim() };
    },
  };
}

export type ContextService = ReturnType<typeof createContextService>;
