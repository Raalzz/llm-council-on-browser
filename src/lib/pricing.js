const CACHE_KEY = 'llmcouncil:pricing_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';

// Per-token USD prices for common models. Used as fallback when /models fetch fails.
// Values sourced from openrouter.ai/models (subject to change — kept conservative).
export const HARDCODED_PRICING = {
  'openai/gpt-4o': { prompt: 2.5e-6, completion: 1.0e-5 },
  'openai/gpt-4o-mini': { prompt: 1.5e-7, completion: 6.0e-7 },
  'openai/gpt-4-turbo': { prompt: 1.0e-5, completion: 3.0e-5 },
  'openai/gpt-3.5-turbo': { prompt: 5.0e-7, completion: 1.5e-6 },
  'anthropic/claude-sonnet-4.5': { prompt: 3.0e-6, completion: 1.5e-5 },
  'anthropic/claude-sonnet-4': { prompt: 3.0e-6, completion: 1.5e-5 },
  'anthropic/claude-opus-4': { prompt: 1.5e-5, completion: 7.5e-5 },
  'anthropic/claude-haiku-4.5': { prompt: 1.0e-6, completion: 5.0e-6 },
  'anthropic/claude-3.5-sonnet': { prompt: 3.0e-6, completion: 1.5e-5 },
  'anthropic/claude-3-haiku': { prompt: 2.5e-7, completion: 1.25e-6 },
  'google/gemini-2.0-flash-001': { prompt: 1.0e-7, completion: 4.0e-7 },
  'google/gemini-2.5-pro': { prompt: 1.25e-6, completion: 1.0e-5 },
  'google/gemini-2.5-flash': { prompt: 3.0e-7, completion: 2.5e-6 },
  'meta-llama/llama-3.3-70b-instruct': { prompt: 5.9e-7, completion: 7.9e-7 },
  'mistralai/mistral-large': { prompt: 2.0e-6, completion: 6.0e-6 },
  'deepseek/deepseek-chat': { prompt: 1.4e-7, completion: 2.8e-7 },
};

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.fetched_at || !parsed?.table) return null;
    const age = Date.now() - new Date(parsed.fetched_at).getTime();
    if (age > CACHE_TTL_MS) return null;
    return parsed.table;
  } catch {
    return null;
  }
}

function writeCache(table) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ fetched_at: new Date().toISOString(), table })
    );
  } catch {
    // Cache is best-effort; ignore quota errors here.
  }
}

function parsePrice(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(num) ? num : null;
}

async function fetchPricingTable() {
  const response = await fetch(OPENROUTER_MODELS_URL);
  if (!response.ok) {
    throw new Error(`OpenRouter /models returned ${response.status}`);
  }
  const data = await response.json();
  const list = Array.isArray(data?.data) ? data.data : [];
  const table = {};
  for (const m of list) {
    if (!m?.id || !m?.pricing) continue;
    const prompt = parsePrice(m.pricing.prompt);
    const completion = parsePrice(m.pricing.completion);
    if (prompt === null || completion === null) continue;
    table[m.id] = { prompt, completion };
  }
  return table;
}

let inFlight = null;

export async function getPricingTable() {
  const cached = readCache();
  if (cached) return cached;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const table = await fetchPricingTable();
      writeCache(table);
      return table;
    } catch (err) {
      console.warn('Pricing fetch failed, using hardcoded fallback:', err);
      return { ...HARDCODED_PRICING };
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export function getPricingForModel(table, modelId) {
  if (!modelId) return null;
  if (table && table[modelId]) return table[modelId];
  if (HARDCODED_PRICING[modelId]) return HARDCODED_PRICING[modelId];
  return null;
}

export function computeCost(usage, pricing) {
  if (!usage || !pricing) return null;
  const prompt = Number(usage.prompt_tokens) || 0;
  const completion = Number(usage.completion_tokens) || 0;
  return prompt * pricing.prompt + completion * pricing.completion;
}
