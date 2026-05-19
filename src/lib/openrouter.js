import { getSettings } from './settings';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function buildHeaders() {
  const { apiKey } = getSettings();
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  if (typeof window !== 'undefined') {
    headers['HTTP-Referer'] = window.location.origin + window.location.pathname;
    headers['X-Title'] = 'LLM Council';
  }
  return headers;
}

async function postWithRetry(payload, signal, timeoutMs) {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (signal) signal.addEventListener('abort', onAbort);
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (response.status === 429) {
      const retryAfter = parseFloat(response.headers.get('retry-after') || '1');
      const waitMs = Math.min(Math.max(retryAfter * 1000, 500), 10000);
      await new Promise((r) => setTimeout(r, waitMs));
      response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`OpenRouter ${response.status}: ${text.slice(0, 200)}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}

export async function queryModel(model, messages, { signal, timeout } = {}) {
  const { requestTimeoutMs } = getSettings();
  const timeoutMs = timeout ?? requestTimeoutMs;
  try {
    const data = await postWithRetry({ model, messages }, signal, timeoutMs);
    const message = data?.choices?.[0]?.message ?? {};
    return {
      content: message.content ?? '',
      reasoning_details: message.reasoning_details,
      usage: data?.usage ?? null,
      resolved_model: data?.model ?? model,
    };
  } catch (err) {
    console.error(`Error querying model ${model}:`, err);
    return null;
  }
}

export async function queryModelsParallel(models, messages, options = {}) {
  const results = await Promise.all(
    models.map((m) => queryModel(m, messages, options))
  );
  const out = {};
  models.forEach((m, i) => { out[m] = results[i]; });
  return out;
}
