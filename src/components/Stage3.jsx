import ReactMarkdown from 'react-markdown';
import StageCostBadge from './StageCostBadge';
import { exportFinalAnswerAsMarkdown } from '../lib/exportMarkdown';
import './Stage3.css';

export default function Stage3({ finalResponse, pricingTable, userMessage, conversationTitle }) {
  if (!finalResponse) {
    return null;
  }

  const canExport = Boolean(userMessage && finalResponse);

  const handleExport = () => {
    exportFinalAnswerAsMarkdown(userMessage, { stage3: finalResponse }, conversationTitle);
  };

  return (
    <div className="stage stage3">
      <div className="stage-title-row">
        <h3 className="stage-title">Stage 3: Final Council Answer</h3>
        <div className="stage-title-actions">
          <StageCostBadge results={finalResponse} pricingTable={pricingTable} />
          {canExport && (
            <button
              type="button"
              className="stage-export-btn"
              onClick={handleExport}
              title="Export final answer as Markdown"
              aria-label="Export final answer as Markdown"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Export</span>
            </button>
          )}
        </div>
      </div>
      <div className="final-response">
        <div className="chairman-label">
          Chairman: {finalResponse.model.split('/')[1] || finalResponse.model}
        </div>
        <div className="final-text markdown-content">
          <ReactMarkdown>{finalResponse.response}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
