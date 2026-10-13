# Context

> Understand more. Keep reading.

Context is a small Chrome extension that sits over whatever you're reading. Highlight a word, a phrase, a book, a person or an idea, and a quiet little card appears next to it telling you **what it is** and **why it matters in the passage you're reading**, without leaving the page. If something catches your curiosity, **Go deeper** opens a notebook-style panel with a fuller, structured explanation and room for follow-up questions.

It is a reading companion, not a chatbot and not a summariser. It never summarises the article, it asks you no quiz questions, and it tries hard to be honest about what it knows versus what it is inferring.

This is a personal project: no accounts, no analytics, no database. A tiny local server holds your API key; the extension talks to that server.

```
Highlight  ->  click the small "c"  ->  card (what it is / in this passage)  ->  Go deeper  ->  ask a follow-up  ->  Esc, keep reading
```

---

## How it works

```
context/
  shared/      Zod schemas, request/response types and size limits (used by both sides)
  server/      Node + Express backend that talks to the LLM provider
    src/prompts/    System prompts and the builders that wrap page text as untrusted data
    src/services/   LLM providers (Anthropic, OpenAI-compatible), Wikipedia verification, orchestration
    src/routes in app.ts   POST /api/explain | /api/deepen | /api/followup, GET /health
  extension/   Manifest V3 extension (TypeScript, React, Vite, Tailwind)
    src/content/      Selection detection, context extraction, positioning, the in-page UI
    src/components/   Card, Exploration panel, thread, ask box, primitives
    src/background/   Service worker: context menu, backend calls, persistent cache
    src/options/      Settings page (server URL, theme, clear cache)
  e2e/         Playwright end-to-end check against real Chromium (uses a fake model endpoint)
```

**Three separate AI operations**, so the card is fast and the deeper work only happens if you ask for it:

| Operation | Endpoint | Model | Output |
| --- | --- | --- | --- |
| Initial card | `/api/explain` | fast | Small structured object: title, labels, what it is, why it matters here, how sure it is |
| Go deeper | `/api/deepen` | deep | Structured sections (paragraphs, formulas, lists, examples), related ideas, further reading |
| Follow-ups | `/api/followup` | deep | A conversational answer. The extension keeps the running history and sends it each time |

**Context sent to the model** is bounded: the exact selection, its paragraph, up to two paragraphs before and one after, the nearest section heading, the article title, site name, meta description, and the page URL **without** its query string or fragment. The whole page is never sent. Limits live in `shared/src/limits.ts` and are enforced on both client and server.

**Accuracy and safety**

- Page text is passed to the model inside delimited `<page_context>` blocks, the system prompt tells the model it is untrusted data, and the delimiters are neutralised if the page tries to forge them.
- The model is told to separate established facts, scholarly interpretation, and inferences about the author's intent, and the UI labels how sure it is (`stated`, `inferred`, `unclear`, and a "not sure" flag when it can't identify the selection).
- **The model never produces URLs.** "Further reading" links appear only for Wikipedia articles the server has verified through the Wikipedia API (redirects followed, disambiguation pages rejected). Original works the model names from memory are listed unlinked and labelled as such.
- Model output is validated with Zod; invalid output gets one repair attempt, then a clear error.
- The server only answers the extension and local tools (web pages cannot call it), and binds to `127.0.0.1` by default.

**Caching**: explanations and deep explorations are cached in `chrome.storage.local` per selection + page + passage (two weeks, 120 entries). Asking about the same thing twice makes no new request. The cache can be cleared from the settings page.

---

## Requirements

- Node.js 20 or newer (developed on 22)
- Google Chrome (or another Chromium browser) 111+
- An API key for **one** provider: Anthropic or OpenAI (or any OpenAI-compatible endpoint)

---

## Install

```bash
npm install
```

(Installs all three workspaces from the repo root.)

## Configure your API key

```bash
cp server/.env.example server/.env
```

Edit `server/.env` and set **one** key:

```ini
ANTHROPIC_API_KEY=sk-ant-...
# or
OPENAI_API_KEY=sk-...
```

`server/.env` is git-ignored. The key never goes into the extension.

### Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | | Use Anthropic (Claude) |
| `OPENAI_API_KEY` | | Use OpenAI |
| `CONTEXT_PROVIDER` | inferred from the key | Force `anthropic` or `openai` if both keys are set |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | Point at any OpenAI-compatible server (OpenRouter, Groq, Ollama at `http://localhost:11434/v1`, ...) |
| `CONTEXT_FAST_MODEL` | `claude-haiku-4-5` / `gpt-4.1-mini` | Model for the quick card |
| `CONTEXT_DEEP_MODEL` | `claude-sonnet-4-5` / `gpt-4.1` | Model for Go deeper and follow-ups |
| `PORT` | `8787` | Server port |
| `HOST` | `127.0.0.1` | Interface to bind |
| `CONTEXT_TIMEOUT_MS` | `45000` | Per-request timeout to the model |

Model names change often. If you get a "could not find the requested model" error, set `CONTEXT_FAST_MODEL` and `CONTEXT_DEEP_MODEL` to models your account has.

## Run the backend

Development (auto-restarts on change):

```bash
npm run dev:server
```

Or build and run:

```bash
npm run build:server
npm start
```

You should see `Context server listening on http://127.0.0.1:8787` and the provider and models in use. Check it:

```bash
curl http://127.0.0.1:8787/health
```

## Build the extension

```bash
npm run build:extension      # one-off build into extension/dist
npm run dev:extension        # rebuild on change (then click reload on chrome://extensions)
```

## Load it into Chrome

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked** and choose the `extension/dist` folder
4. (Optional) Pin the Context icon. Clicking it opens the settings page, where **Test connection** confirms the extension can reach your server

Pages that were already open when you installed or reloaded the extension need a refresh before the little "c" trigger appears. (The right-click menu works without a refresh.)

## Use it

1. Open an essay (a Substack post, a paper, documentation, anything).
2. Highlight a phrase, e.g. *The Brothers Karamazov*.
3. Click the small **c** that appears under the selection. Or right-click the selection and choose **Explain with Context**.
4. Read the card. **Go deeper** expands it into the notebook panel (the page scrolls a little if it needs to make room). Use **Ask about this** for follow-ups, or click a related idea to ask how it connects.
5. Dismiss with **Esc**, the **x**, or by clicking anywhere outside. The theme button (half-filled circle) flips light/dark; by default the card matches the page.

---

## Development

```bash
npm run typecheck      # TypeScript, all workspaces
npm test               # unit tests (vitest), server + extension
npm run build          # server + extension
npm run e2e            # builds, then drives real Chromium (see below)
```

**Unit tests** cover prompt construction and injection hardening, provider request/response handling and error mapping, Wikipedia verification, route behaviour and validation, context extraction, positioning math, the rich-text parser, theme detection, the persistent cache and the extension's API client.

**End-to-end** (`e2e/run.mjs`) launches Chromium with the built extension, a fake OpenAI-compatible model endpoint, the real built server, and fixture pages (a normal essay, a page with hostile CSS, and a page with a strict Content-Security-Policy). It checks the full flow: select, trigger, card, Go deeper, follow-ups, Esc and outside-click dismissal, scrolling, small viewports, resizing, the context-menu path, caching, error and retry, and the settings page. It does **not** test real model quality. One-time setup:

```bash
npx playwright-core install chromium
```

Screenshots are written to `e2e/.output/` (git-ignored).

**Design tokens** live in `extension/src/styles/tokens.css` (colours, light and dark) and `extension/tailwind.config.js` (px-based type and spacing, so a host page's root font-size can't distort the UI). **Prompts** live in `server/src/prompts/system.ts`. **Provider code** is in `server/src/services/llm/`; adding a provider means implementing the small `LLMProvider` interface and registering it in `index.ts`.

Icons can be regenerated with `npm run icons -w extension`.

---

## Troubleshooting

**The card says "Can't reach the Context server".**
The backend isn't running or is on a different address. Start it with `npm run dev:server`, then open the extension's settings page (click the toolbar icon) and use *Test connection*. If you changed `PORT`, update the server URL there.

**"No model provider is configured".**
`server/.env` is missing or has no key. Add one key, restart the server.

**"rejected the API key" / "could not find the requested model".**
Check the key, and set `CONTEXT_FAST_MODEL` / `CONTEXT_DEEP_MODEL` to models available to your account.

**The trigger doesn't show up.**
Reload the page (it was opened before the extension was loaded). Context does not run in text fields, on `chrome://` pages, in Chrome's built-in PDF viewer, or inside iframes. Selected text in those can't be offered a trigger.

**The extension doesn't update after a rebuild.**
After `npm run build:extension` (or while `dev:extension` is running), click the reload icon for Context on `chrome://extensions`, then refresh the page you're reading.

**Fonts look like system fonts.**
Fonts are bundled and loaded from the extension. If the build was interrupted, rebuild so `extension/dist/fonts` is populated.

**Slow answers.**
The card uses the fast model; Go deeper and follow-ups use the deep one. Pick smaller models with `CONTEXT_FAST_MODEL` / `CONTEXT_DEEP_MODEL`, or raise `CONTEXT_TIMEOUT_MS`.

---

## Limitations

- Works on `http(s)` pages in the top frame. Not in iframes, PDFs, or editable fields.
- Mathematics is written in plain Unicode (for example `θ ← θ − η ∇L(θ)`), not typeset LaTeX.
- Verified links come only from Wikipedia. Primary sources the model names are shown unlinked.
- Answers are only as good as the model you configure. Context asks for hedged, honest answers and flags uncertainty, but you should still treat it as a well-read friend, not an authority.
- No streaming yet: you see a loading state, then the full card.
