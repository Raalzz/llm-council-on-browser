const SETTINGS_KEY = 'llmcouncil:settings';

export const DEFAULT_SETTINGS = {
  apiKey: '',
  councilModels: [
    'openai/gpt-5.1',
    'google/gemini-3-pro-preview',
    'anthropic/claude-sonnet-4.5',
    'x-ai/grok-4',
  ],
  chairmanModel: 'google/gemini-3-pro-preview',
  titleModel: 'google/gemini-2.5-flash',
  requestTimeoutMs: 120000,
};

export function getSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function setSettings(partial) {
  const next = { ...getSettings(), ...partial };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export function resetSettings() {
  localStorage.removeItem(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS };
}

export function hasApiKey() {
  return getSettings().apiKey.trim().length > 0;
}
