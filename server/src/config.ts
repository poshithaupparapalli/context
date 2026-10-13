export type ProviderName = "anthropic" | "openai";

export interface Config {
  port: number;
  host: string;
  timeoutMs: number;
  provider: ProviderName | null;
  anthropicApiKey?: string;
  openaiApiKey?: string;
  openaiBaseUrl: string;
  anthropicBaseUrl: string;
  fastModel: string | null;
  deepModel: string | null;
}

const DEFAULT_MODELS: Record<ProviderName, { fast: string; deep: string }> = {
  anthropic: { fast: "claude-haiku-4-5", deep: "claude-sonnet-4-5" },
  openai: { fast: "gpt-4.1-mini", deep: "gpt-4.1" },
};

function clean(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v ? v : undefined;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const anthropicApiKey = clean(env.ANTHROPIC_API_KEY);
  const openaiApiKey = clean(env.OPENAI_API_KEY);

  const forced = clean(env.CONTEXT_PROVIDER)?.toLowerCase();
  let provider: ProviderName | null = null;
  if (forced === "anthropic" || forced === "openai") provider = forced;
  else if (anthropicApiKey) provider = "anthropic";
  else if (openaiApiKey) provider = "openai";

  const hasKey =
    (provider === "anthropic" && anthropicApiKey) || (provider === "openai" && openaiApiKey);

  const defaults = provider ? DEFAULT_MODELS[provider] : null;

  return {
    port: Number(env.PORT) || 8787,
    host: clean(env.HOST) ?? "127.0.0.1",
    timeoutMs: Number(env.CONTEXT_TIMEOUT_MS) || 45_000,
    provider: hasKey ? provider : null,
    anthropicApiKey,
    openaiApiKey,
    openaiBaseUrl: (clean(env.OPENAI_BASE_URL) ?? "https://api.openai.com/v1").replace(/\/+$/, ""),
    anthropicBaseUrl: (clean(env.ANTHROPIC_BASE_URL) ?? "https://api.anthropic.com").replace(/\/+$/, ""),
    fastModel: hasKey ? (clean(env.CONTEXT_FAST_MODEL) ?? defaults?.fast ?? null) : null,
    deepModel: hasKey ? (clean(env.CONTEXT_DEEP_MODEL) ?? defaults?.deep ?? null) : null,
  };
}
