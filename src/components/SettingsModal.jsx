import { useState } from 'react';
import { DEFAULT_SETTINGS, getSettings, resetSettings, setSettings } from '../lib/settings';
import { clearAllStoredData, hasStoredData } from '../lib/storage';
import './SettingsModal.css';

export default function SettingsModal({ onClose, requireApiKey = false }) {
  const initial = getSettings();
  const [apiKey, setApiKey] = useState(initial.apiKey);
  const [councilModelsText, setCouncilModelsText] = useState(initial.councilModels.join('\n'));
  const [chairmanModel, setChairmanModel] = useState(initial.chairmanModel);
  const [titleModel, setTitleModel] = useState(initial.titleModel);
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const hasData = hasStoredData();

  const handleSave = () => {
    const councilModels = councilModelsText
      .split('\n')
      .map((m) => m.trim())
      .filter(Boolean);

    if (!apiKey.trim()) {
      setError('OpenRouter API key is required.');
      return;
    }
    if (councilModels.length < 2) {
      setError('At least 2 council models are required.');
      return;
    }
    if (!chairmanModel.trim()) {
      setError('Chairman model is required.');
      return;
    }

    setSettings({
      apiKey: apiKey.trim(),
      councilModels,
      chairmanModel: chairmanModel.trim(),
      titleModel: titleModel.trim() || DEFAULT_SETTINGS.titleModel,
    });
    onClose(true);
  };

  const handleReset = () => {
    const s = resetSettings();
    setApiKey(s.apiKey);
    setCouncilModelsText(s.councilModels.join('\n'));
    setChairmanModel(s.chairmanModel);
    setTitleModel(s.titleModel);
    setError('');
  };

  const handleClear = () => {
    const ok = window.confirm(
      'This will permanently delete your saved OpenRouter API key, model preferences, and every conversation stored in this browser. Continue?'
    );
    if (!ok) return;
    clearAllStoredData();
    window.location.reload();
  };

  return (
    <div className="settings-overlay" onClick={requireApiKey ? undefined : () => onClose(false)}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          {!requireApiKey && (
            <button className="settings-close" onClick={() => onClose(false)} aria-label="Close">
              x
            </button>
          )}
        </div>

        <div className="settings-body">
          {requireApiKey && (
            <div className="settings-notice">
              Enter your OpenRouter API key to get started. The key is stored only in this
              browser's localStorage and is sent directly from your browser to OpenRouter.
              Get a key at <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer">openrouter.ai/keys</a>.
            </div>
          )}

          <label className="settings-field">
            <span>OpenRouter API key</span>
            <div className="settings-key-row">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-or-v1-..."
                autoComplete="off"
              />
              <button type="button" className="settings-secondary" onClick={() => setShowKey((v) => !v)}>
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <label className="settings-field">
            <span>Council models (one per line)</span>
            <textarea
              rows={6}
              value={councilModelsText}
              onChange={(e) => setCouncilModelsText(e.target.value)}
              spellCheck={false}
            />
            <small>Browse model IDs at <a href="https://openrouter.ai/models" target="_blank" rel="noreferrer">openrouter.ai/models</a>.</small>
          </label>

          <label className="settings-field">
            <span>Chairman model</span>
            <input
              type="text"
              value={chairmanModel}
              onChange={(e) => setChairmanModel(e.target.value)}
              spellCheck={false}
            />
          </label>

          <label className="settings-field">
            <span>Title model</span>
            <input
              type="text"
              value={titleModel}
              onChange={(e) => setTitleModel(e.target.value)}
              spellCheck={false}
            />
            <small>Used to summarize new conversations into short titles.</small>
          </label>

          {error && <div className="settings-error">{error}</div>}
        </div>

        <div className="settings-footer">
          <div className="settings-footer-left">
            {hasData && (
              <button
                type="button"
                className="settings-danger"
                onClick={handleClear}
                title="Permanently deletes your OpenRouter API key, model preferences, and all conversation history stored in this browser. The page will reload afterwards."
              >
                Clear Credentials
              </button>
            )}
            <button type="button" className="settings-secondary" onClick={handleReset}>
              Reset to defaults
            </button>
          </div>
          <button type="button" className="settings-primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
