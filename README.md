# LLM Council (Browser Edition)

A static-site fork of [karpathy/llm-council](https://github.com/karpathy/llm-council) that runs **entirely in the browser** — no server, no database, no signup. Each visitor brings their own OpenRouter API key and stores it in their own browser's `localStorage`.

Live: `https://raalzz.github.io/llm-council-on-browser/`

## What it does

A 3-stage deliberation flow over multiple LLMs (via OpenRouter):

1. **Stage 1** — every council model answers the question independently.
2. **Stage 2** — the same models rank each others' responses, anonymized.
3. **Stage 3** — a chairman model synthesizes a final answer from the responses + rankings.

All orchestration runs in your browser. The repo has no backend.

## Trust model

- Your OpenRouter key lives only in your browser's `localStorage`. It is sent directly from your browser to `https://openrouter.ai`. The repo owner never sees it.
- Conversations are also stored in your `localStorage` — they're scoped to the browser you used to write them. Clearing site data wipes them.
- The repo is fully static. Anyone hosting a fork has no way to capture visitor traffic.

## Local development

```bash
npm install
npm run dev
```

Open the URL Vite prints (note the trailing path — the dev server respects `base`):

```
http://localhost:5173/llm-council-on-browser/
```

On first load, a settings modal will ask for your OpenRouter API key. Get one at [openrouter.ai/keys](https://openrouter.ai/keys).

## Configuring the council

The Settings panel lets you change:

- **Council models** — one OpenRouter model id per line (browse at [openrouter.ai/models](https://openrouter.ai/models)). 2 minimum.
- **Chairman model** — synthesizes the final answer.
- **Title model** — generates short titles for new conversations.

Defaults match upstream: GPT-5.1, Gemini 3 Pro, Claude Sonnet 4.5, Grok 4, with Gemini 3 Pro as chairman.

## Deploying your own copy

1. Fork or create a repo (the included `vite.config.js` assumes the repo is named `llm-council-on-browser`; change `base` if you rename).
2. Push to `main`.
3. In repo Settings -> Pages, set **Source** to **GitHub Actions**.
4. The included `.github/workflows/deploy.yml` builds with Node 20 and publishes via `actions/deploy-pages`. Your URL will be `https://<username>.github.io/<repo>/`.

## Project layout

```
src/
  api.js                # thin facade — preserves the upstream surface area
  lib/
    openrouter.js       # direct OpenRouter client
    council.js          # 3-stage orchestration (port of backend/council.py)
    storage.js          # localStorage CRUD for conversations
    settings.js         # localStorage CRUD for API key + model config
  components/
    SettingsModal.jsx   # API key + model configuration
    Sidebar.jsx         # (unchanged from upstream)
    ChatInterface.jsx   # (unchanged from upstream)
    Stage1/2/3.jsx      # (unchanged from upstream)
```

## Credit

Original concept and UI by Andrej Karpathy: <https://github.com/karpathy/llm-council>.
