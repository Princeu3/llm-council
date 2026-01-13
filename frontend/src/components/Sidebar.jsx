import { memo } from 'react';
import './Sidebar.css';

function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  isCreating,
}) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>LLM Council</h1>
        <button
          className={`new-conversation-btn ${isCreating ? 'creating' : ''}`}
          onClick={onNewConversation}
          disabled={isCreating}
        >
          {isCreating ? (
            <>
              <span className="btn-spinner"></span>
              Creating...
            </>
          ) : (
            '+ New Conversation'
          )}
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
              } ${conv.id.startsWith('temp-') ? 'creating' : ''}`}
              onClick={() => !conv.id.startsWith('temp-') && onSelectConversation(conv.id)}
            >
              <div className="conversation-title">
                {conv.title || 'New Conversation'}
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

// Memoize to prevent unnecessary re-renders
export default memo(Sidebar);
