import { memo, useState, useRef, useEffect } from 'react';
import './Sidebar.css';

function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
  isCreating,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [menuOpenId, setMenuOpenId] = useState(null);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuToggle = (e, convId) => {
    e.stopPropagation();
    setMenuOpenId(menuOpenId === convId ? null : convId);
  };

  const handleStartEdit = (e, conv) => {
    e.stopPropagation();
    setMenuOpenId(null);
    setEditingId(conv.id);
    setEditTitle(conv.title || 'New Conversation');
  };

  const handleSaveEdit = async (e) => {
    e.stopPropagation();
    if (editTitle.trim() && editingId) {
      await onRenameConversation(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setEditingId(null);
    setEditTitle('');
  };

  const handleDelete = (e, convId) => {
    e.stopPropagation();
    setMenuOpenId(null);
    if (confirm('Delete this conversation?')) {
      onDeleteConversation(convId);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveEdit(e);
    } else if (e.key === 'Escape') {
      handleCancelEdit(e);
    }
  };

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
              {editingId === conv.id ? (
                <div className="conversation-edit" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="edit-input"
                  />
                  <div className="edit-actions">
                    <button onClick={handleSaveEdit} className="edit-btn save" title="Save">
                      ✓
                    </button>
                    <button onClick={handleCancelEdit} className="edit-btn cancel" title="Cancel">
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="conversation-title">
                    {conv.title || 'New Conversation'}
                  </div>
                  <div className="conversation-meta">
                    <span>{conv.message_count} messages</span>
                    {!conv.id.startsWith('temp-') && (
                      <div className="menu-container" ref={menuOpenId === conv.id ? menuRef : null}>
                        <button
                          className="menu-btn"
                          onClick={(e) => handleMenuToggle(e, conv.id)}
                          title="Options"
                        >
                          ⋮
                        </button>
                        {menuOpenId === conv.id && (
                          <div className="dropdown-menu">
                            <button onClick={(e) => handleStartEdit(e, conv)}>
                              ✎ Rename
                            </button>
                            <button onClick={(e) => handleDelete(e, conv.id)} className="delete">
                              🗑 Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export default memo(Sidebar);
