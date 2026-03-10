import { memo, useState, useRef, useEffect } from 'react';
import { UserButton, useUser } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import { Plus, MoreHorizontal, Pencil, Trash2, Check, X, Crown, Loader2 } from 'lucide-react';
import ModelSettings from './ModelSettings';

function SidebarContent({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
  isCreating,
  modelSettings,
  onConversationSelected,
}) {
  const { user } = useUser();
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [menuOpenId, setMenuOpenId] = useState(null);
  const menuRef = useRef(null);

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
    if (e.key === 'Enter') handleSaveEdit(e);
    else if (e.key === 'Escape') handleCancelEdit(e);
  };

  const handleSelectConv = (id) => {
    onSelectConversation(id);
    onConversationSelected?.();
  };

  const handleNewConv = () => {
    onNewConversation();
    onConversationSelected?.();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Crown className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-[--font-display] text-[15px] font-bold tracking-tight text-foreground">
              LLM Council
            </span>
          </div>
        </div>

        <Button
          className="w-full justify-start gap-2 bg-primary hover:bg-primary/90 text-primary-foreground h-9 rounded-lg text-sm font-medium"
          onClick={handleNewConv}
          disabled={isCreating}
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              New Conversation
            </>
          )}
        </Button>
      </div>

      <Separator />

      {/* Conversation List */}
      <ScrollArea className="flex-1 px-2 py-2">
        {conversations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No conversations yet
          </div>
        ) : (
          <div className="space-y-0.5">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`
                  group relative flex flex-col rounded-lg px-3 py-2.5 cursor-pointer transition-colors duration-150
                  ${conv.id === currentConversationId
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-muted text-foreground'
                  }
                  ${conv.id.startsWith('temp-') ? 'opacity-60 pointer-events-none' : ''}
                `}
                onClick={() => !conv.id.startsWith('temp-') && handleSelectConv(conv.id)}
              >
                {editingId === conv.id ? (
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      className="flex-1 text-sm bg-card border border-input rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      onClick={handleSaveEdit}
                      className="p-1 rounded hover:bg-primary/10 text-primary"
                      title="Save"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-1 rounded hover:bg-destructive/10 text-destructive"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate pr-6">
                        {conv.title || 'New Conversation'}
                      </span>
                      {!conv.id.startsWith('temp-') && (
                        <div
                          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          ref={menuOpenId === conv.id ? menuRef : null}
                        >
                          <button
                            className="p-1 rounded hover:bg-background/80"
                            onClick={(e) => handleMenuToggle(e, conv.id)}
                          >
                            <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          {menuOpenId === conv.id && (
                            <div className="absolute right-0 top-full mt-1 w-36 bg-popover border border-border rounded-lg shadow-lg py-1 z-50">
                              <button
                                className="w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-accent text-foreground"
                                onClick={(e) => handleStartEdit(e, conv)}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Rename
                              </button>
                              <button
                                className="w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-destructive/10 text-destructive"
                                onClick={(e) => handleDelete(e, conv.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {conv.message_count || 0} messages
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <Separator />
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <UserButton />
          <span className="text-sm font-medium text-foreground truncate">
            {user?.firstName}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {modelSettings && (
            <ModelSettings
              availableModels={modelSettings.availableModels}
              councilModels={modelSettings.councilModels}
              chairmanModel={modelSettings.chairmanModel}
              onToggleCouncil={modelSettings.toggleCouncilModel}
              onSetChairman={modelSettings.setChairmanModel}
              onReset={modelSettings.resetToDefaults}
              isCustom={modelSettings.isCustom}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
  isCreating,
  modelSettings,
  isMobile,
  mobileOpen,
  onMobileOpenChange,
}) {
  const contentProps = {
    conversations,
    currentConversationId,
    onSelectConversation,
    onNewConversation,
    onRenameConversation,
    onDeleteConversation,
    isCreating,
    modelSettings,
  };

  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-[280px] p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent
            {...contentProps}
            onConversationSelected={() => onMobileOpenChange(false)}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="w-[280px] h-full flex flex-col bg-[--background] border-r border-border shrink-0">
      <SidebarContent {...contentProps} />
    </div>
  );
}

export default memo(Sidebar);
