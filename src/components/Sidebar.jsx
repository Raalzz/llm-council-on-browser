import { api } from '../api';
import { exportConversationAsMarkdown } from '../lib/exportMarkdown';
import './Sidebar.css';

export default function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  pricingTable,
}) {
  const handleExport = async (event, convId) => {
    event.stopPropagation();
    try {
      const full = await api.getConversation(convId);
      if (!full) return;
      exportConversationAsMarkdown(full, pricingTable);
    } catch (err) {
      console.error('Export failed:', err);
      alert(`Export failed: ${err?.message || err}`);
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>LLM Council</h1>
        <button className="new-conversation-btn" onClick={onNewConversation}>
          + New Conversation
        </button>
      </div>

      <div className="conversation-list">
        {conversations.length === 0 ? (
          <div className="no-conversations">No conversations yet</div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conversation-item ${
                conv.id === currentConversationId ? 'active' : ''
              }`}
              onClick={() => onSelectConversation(conv.id)}
            >
              <div className="conversation-row">
                <div className="conversation-title">
                  {conv.title || 'New Conversation'}
                </div>
                <button
                  type="button"
                  className="conversation-export-btn"
                  onClick={(e) => handleExport(e, conv.id)}
                  title="Export conversation as Markdown"
                  aria-label="Export conversation as Markdown"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
              </div>
              <div className="conversation-meta">
                {conv.message_count} messages
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
