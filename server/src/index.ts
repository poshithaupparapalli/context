import "dotenv/config";
import { loadConfig } from "./config.js";
import { createApp } from "./app.js";
import { createContextService } from "./services/context-service.js";
import { createProvider } from "./services/llm/index.js";
import { createWikipediaVerifier } from "./services/wikipedia.js";

const config = loadConfig();
const provider = createProvider(config);
const service = createContextService({
  config,
  provider,
  wikipedia: createWikipediaVerifier(),
});
const app = createApp({ config, service });

app.listen(config.port, config.host, () => {
  const url = `http://${config.host}:${config.port}`;
  console.log(`\n  Context server listening on ${url}`);
  if (provider) {
    console.log(`  Provider: ${provider.name}  (fast: ${config.fastModel}, deep: ${config.deepModel})\n`);
  } else {
    console.log("  No provider configured: add ANTHROPIC_API_KEY or OPENAI_API_KEY to server/.env");
    console.log("  and restart. The extension will show a setup message until then.\n");
  }
});
