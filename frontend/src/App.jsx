import { useState, useEffect, useCallback } from 'react';
import { useAuth, SignedIn, SignedOut } from '@clerk/clerk-react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import LandingPage from './components/LandingPage';
import { api } from './api';
import { useModelSettings } from './hooks/useModelSettings';
import { useIsMobile } from './hooks/useIsMobile';
import { Crown, Menu } from 'lucide-react';

/**
 * Immutably update the last message in a conversation's messages array.
 */
function updateLastMessage(prev, updater) {
  const messages = [...prev.messages];
  messages[messages.length - 1] = updater({ ...messages[messages.length - 1] });
  return { ...prev, messages };
}

function App() {
  const { getToken, isLoaded } = useAuth();
  const modelSettings = useModelSettings();
  const isMobile = useIsMobile();
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    api.setTokenGetter(getToken);
  }, [getToken]);

  useEffect(() => {
    if (isLoaded) {
      loadConversations();
      modelSettings.fetchModels();
    }
  }, [isLoaded]);

  useEffect(() => {
    if (currentConversationId && !currentConversationId.startsWith('temp-')) {
      loadConversation(currentConversationId);
    }
  }, [currentConversationId]);

  const loadConversations = useCallback(async () => {
    try {
      const convs = await api.listConversations();
      setConversations(convs);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, []);

  const loadConversation = useCallback(async (id) => {
    setIsLoadingConversation(true);
    try {
      const conv = await api.getConversation(id);
      setCurrentConversation(conv);
    } catch (err) {
      console.error('Failed to load conversation:', err);
    } finally {
      setIsLoadingConversation(false);
    }
  }, []);

  const handleNewConversation = useCallback(async () => {
    if (isCreatingConversation) return;

    setIsCreatingConversation(true);

    const tempId = 'temp-' + Date.now();
    const tempConv = {
      id: tempId,
      title: 'New Conversation',
      created_at: new Date().toISOString(),
      message_count: 0,
    };

    setConversations(prev => [tempConv, ...prev]);
    setCurrentConversationId(tempId);
    setCurrentConversation({ id: tempId, title: 'New Conversation', messages: [] });

    try {
      const newConv = await api.createConversation();
      setConversations(prev =>
        prev.map(c => c.id === tempId ? { ...newConv, message_count: 0 } : c)
      );
      setCurrentConversationId(newConv.id);
      setCurrentConversation(newConv);
    } catch (err) {
      console.error('Failed to create conversation:', err);
      setConversations(prev => prev.filter(c => c.id !== tempId));
      setCurrentConversationId(null);
      setCurrentConversation(null);
    } finally {
      setIsCreatingConversation(false);
    }
  }, [isCreatingConversation]);

  const handleSelectConversation = useCallback((id) => {
    if (id === currentConversationId) return;
    setCurrentConversationId(id);
    setCurrentConversation(null);
  }, [currentConversationId]);

  const handleRenameConversation = useCallback(async (id, newTitle) => {
    try {
      await api.renameConversation(id, newTitle);
      setConversations(prev =>
        prev.map(c => c.id === id ? { ...c, title: newTitle } : c)
      );
      if (currentConversation?.id === id) {
        setCurrentConversation(prev => ({ ...prev, title: newTitle }));
      }
    } catch (err) {
      console.error('Failed to rename conversation:', err);
    }
  }, [currentConversation?.id]);

  const handleDeleteConversation = useCallback(async (id) => {
    try {
      await api.deleteConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (currentConversationId === id) {
        setCurrentConversationId(null);
        setCurrentConversation(null);
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  }, [currentConversationId]);

  const handleSendMessage = useCallback(async (content) => {
    if (!currentConversationId || currentConversationId.startsWith('temp-')) return;

    setIsLoading(true);
    setError(null);
    try {
      setCurrentConversation((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          { role: 'user', content },
          {
            role: 'assistant',
            stage1: null,
            stage2: null,
            stage3: null,
            metadata: null,
            loading: { stage1: false, stage2: false, stage3: false },
          },
        ],
      }));

      await api.sendMessageStream(currentConversationId, content, (eventType, event) => {
        switch (eventType) {
          case 'stage1_start':
            setCurrentConversation((prev) => updateLastMessage(prev, (msg) => ({
              ...msg, loading: { ...msg.loading, stage1: true },
            })));
            break;

          case 'stage1_complete':
            setCurrentConversation((prev) => updateLastMessage(prev, (msg) => ({
              ...msg, stage1: event.data, loading: { ...msg.loading, stage1: false },
            })));
            break;

          case 'stage2_start':
            setCurrentConversation((prev) => updateLastMessage(prev, (msg) => ({
              ...msg, loading: { ...msg.loading, stage2: true },
            })));
            break;

          case 'stage2_complete':
            setCurrentConversation((prev) => updateLastMessage(prev, (msg) => ({
              ...msg,
              stage2: event.data,
              metadata: event.metadata,
              loading: { ...msg.loading, stage2: false },
            })));
            break;

          case 'stage3_start':
            setCurrentConversation((prev) => updateLastMessage(prev, (msg) => ({
              ...msg, loading: { ...msg.loading, stage3: true },
            })));
            break;

          case 'stage3_complete':
            setCurrentConversation((prev) => updateLastMessage(prev, (msg) => ({
              ...msg, stage3: event.data, loading: { ...msg.loading, stage3: false },
            })));
            break;

          case 'title_complete':
            loadConversations();
            break;

          case 'complete':
            loadConversations();
            setIsLoading(false);
            break;

          case 'error':
            console.error('Stream error:', event.message);
            setError(event.message || 'An error occurred');
            setIsLoading(false);
            break;

          default:
            console.log('Unknown event type:', eventType);
        }
      }, modelSettings.modelConfig);
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err.message || 'Failed to send message');
      setCurrentConversation((prev) => ({
        ...prev,
        messages: prev.messages.slice(0, -2),
      }));
      setIsLoading(false);
    }
  }, [currentConversationId, loadConversations, modelSettings.modelConfig]);

  return (
    <>
      <SignedOut>
        <LandingPage />
      </SignedOut>
      <SignedIn>
        <div className="flex h-dvh w-screen overflow-hidden bg-[--background]">
          <Sidebar
            conversations={conversations}
            currentConversationId={currentConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            onRenameConversation={handleRenameConversation}
            onDeleteConversation={handleDeleteConversation}
            isCreating={isCreatingConversation}
            modelSettings={modelSettings}
            isMobile={isMobile}
            mobileOpen={sidebarOpen}
            onMobileOpenChange={setSidebarOpen}
          />
          <div className="flex-1 flex flex-col min-w-0">
            {/* Mobile header */}
            {isMobile && (
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-[--background] shrink-0">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-1.5 -ml-1 rounded-lg hover:bg-muted transition-colors"
                >
                  <Menu className="w-5 h-5 text-foreground" />
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                    <Crown className="w-3 h-3 text-primary-foreground" />
                  </div>
                  <span className="font-[--font-display] text-sm font-bold tracking-tight text-foreground truncate">
                    {currentConversation?.title || 'LLM Council'}
                  </span>
                </div>
              </div>
            )}
            <ChatInterface
              conversation={currentConversation}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              isLoadingConversation={isLoadingConversation}
              error={error}
              onClearError={() => setError(null)}
            />
          </div>
        </div>
      </SignedIn>
    </>
  );
}

export default App;
