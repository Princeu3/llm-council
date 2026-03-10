import { useState, useEffect, useRef, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import Stage1 from './Stage1';
import Stage2 from './Stage2';
import Stage3 from './Stage3';
import { Send, Loader2, Crown, X, MessageSquare, Users, Shield, Scale } from 'lucide-react';

function StageProgress({ loading, stage1, stage2, stage3 }) {
  const stages = [
    { key: 'stage1', label: 'Responses', icon: MessageSquare, done: !!stage1, active: loading?.stage1 },
    { key: 'stage2', label: 'Review', icon: Shield, done: !!stage2, active: loading?.stage2 },
    { key: 'stage3', label: 'Synthesis', icon: Scale, done: !!stage3, active: loading?.stage3 },
  ];

  return (
    <div className="flex items-center gap-1 mb-4 overflow-x-auto">
      {stages.map((s, i) => (
        <div key={s.key} className="flex items-center shrink-0">
          <div
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
              s.done
                ? 'bg-primary/10 text-primary'
                : s.active
                  ? 'bg-wisteria/15 text-wisteria animate-pulse'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {s.active ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : s.done ? (
              <s.icon className="w-3 h-3" />
            ) : (
              <s.icon className="w-3 h-3 opacity-40" />
            )}
            <span>{s.label}</span>
          </div>
          {i < stages.length - 1 && (
            <div className={`w-4 sm:w-6 h-px mx-0.5 sm:mx-1 transition-colors duration-300 ${
              s.done ? 'bg-primary/30' : 'bg-border'
            }`} />
          )}
        </div>
      ))}
    </div>
  );
}

function hasAnyStageActivity(msg) {
  return msg.stage1 || msg.stage2 || msg.stage3
    || msg.loading?.stage1 || msg.loading?.stage2 || msg.loading?.stage3;
}

function ChatInterface({
  conversation,
  onSendMessage,
  isLoading,
  isLoadingConversation,
  error,
  onClearError,
}) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[--background]">
        <div className="text-center max-w-md px-6">
          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-5">
            <Crown className="w-7 h-7 text-primary" />
          </div>
          <h2 className="font-[--font-display] text-2xl font-bold text-foreground mb-2">
            Welcome to LLM Council
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Create a new conversation to consult the council
          </p>
        </div>
      </div>
    );
  }

  if (isLoadingConversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[--background]">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading conversation...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[--background] min-w-0 overflow-hidden">
      {/* Error Banner */}
      {error && (
        <div className="mx-3 sm:mx-4 mt-3 px-3 sm:px-4 py-2.5 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center justify-between">
          <span className="text-sm text-destructive">{error}</span>
          <button onClick={onClearError} className="p-0.5 hover:bg-destructive/10 rounded shrink-0 ml-2">
            <X className="w-4 h-4 text-destructive" />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 overscroll-contain">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 min-w-0">
          {conversation.messages.length === 0 ? (
            <div className="flex items-center justify-center h-[50vh]">
              <div className="text-center max-w-lg px-2">
                <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-5">
                  <Users className="w-7 h-7 text-primary" />
                </div>
                <h2 className="font-[--font-display] text-xl font-bold text-foreground mb-2">
                  Start a conversation
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Ask a question and the council will deliberate through three stages:
                  individual responses, anonymous peer review, and a final synthesis.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 sm:space-y-8 min-w-0">
              {conversation.messages.map((msg, index) => (
                <div key={index}>
                  {msg.role === 'user' ? (
                    <div className="flex justify-end mb-2">
                      <div className="max-w-[90%] sm:max-w-[80%]">
                        <div className="text-xs font-medium text-muted-foreground mb-1.5 text-right">
                          You
                        </div>
                        <div className="bg-primary text-primary-foreground px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl rounded-br-md shadow-sm min-w-0 overflow-hidden">
                          <div className="markdown-content text-sm [&_*]:text-primary-foreground">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="min-w-0 overflow-hidden">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center shrink-0">
                          <Crown className="w-3 h-3 text-primary-foreground" />
                        </div>
                        <span className="text-xs font-semibold text-foreground">LLM Council</span>
                      </div>

                      {!hasAnyStageActivity(msg) && (
                        <div className="flex items-center gap-2 py-4 text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Starting council process...</span>
                        </div>
                      )}

                      {hasAnyStageActivity(msg) && (
                        <StageProgress
                          loading={msg.loading}
                          stage1={msg.stage1}
                          stage2={msg.stage2}
                          stage3={msg.stage3}
                        />
                      )}

                      {/* Stage 3 first — the hero answer */}
                      {msg.stage3 && <Stage3 finalResponse={msg.stage3} />}
                      {msg.loading?.stage3 && (
                        <div className="flex items-center gap-2 py-3 text-wisteria">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm font-medium">Synthesizing final answer...</span>
                        </div>
                      )}

                      {/* Stage 1 — collapsible detail */}
                      {msg.loading?.stage1 && (
                        <div className="flex items-center gap-2 py-3 text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Collecting individual responses...</span>
                        </div>
                      )}
                      {msg.stage1 && <Stage1 responses={msg.stage1} collapsed={!!msg.stage3} />}

                      {/* Stage 2 — collapsible detail */}
                      {msg.loading?.stage2 && (
                        <div className="flex items-center gap-2 py-3 text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Running peer review...</span>
                        </div>
                      )}
                      {msg.stage2 && (
                        <Stage2
                          rankings={msg.stage2}
                          labelToModel={msg.metadata?.label_to_model}
                          aggregateRankings={msg.metadata?.aggregate_rankings}
                          collapsed={!!msg.stage3}
                        />
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      {conversation.messages.length === 0 && (
        <div className="border-t border-border bg-card/50 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
            <div className="relative bg-card border border-border rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition-all">
              <textarea
                ref={textareaRef}
                className="w-full resize-none bg-transparent px-3 sm:px-4 py-3 pr-12 sm:pr-14 text-sm text-foreground placeholder:text-muted-foreground outline-none min-h-[48px] max-h-[200px] rounded-xl"
                placeholder="Ask your question..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                rows={1}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 bottom-2 h-8 w-8 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-30"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Your question will be deliberated by {4} AI models through peer review
            </p>
          </form>
        </div>
      )}
    </div>
  );
}

export default memo(ChatInterface);
