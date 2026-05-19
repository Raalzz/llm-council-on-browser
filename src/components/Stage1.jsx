import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import StageCostBadge from './StageCostBadge';
import './Stage1.css';

export default function Stage1({ responses, pricingTable }) {
  const [activeTab, setActiveTab] = useState(0);

  if (!responses || responses.length === 0) {
    return null;
  }

  return (
    <div className="stage stage1">
      <div className="stage-title-row">
        <h3 className="stage-title">Stage 1: Individual Responses</h3>
        <StageCostBadge results={responses} pricingTable={pricingTable} />
      </div>

      <div className="tabs">
        {responses.map((resp, index) => (
          <button
            key={index}
            className={`tab ${activeTab === index ? 'active' : ''}`}
            onClick={() => setActiveTab(index)}
          >
            {resp.model.split('/')[1] || resp.model}
          </button>
        ))}
      </div>

      <div className="tab-content">
        <div className="model-name">{responses[activeTab].model}</div>
        <div className="response-text markdown-content">
          <ReactMarkdown>{responses[activeTab].response}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
