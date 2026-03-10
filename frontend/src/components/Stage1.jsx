import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { getModelShortName } from '../utils';
import { MessageSquare, ChevronDown } from 'lucide-react';

export default function Stage1({ responses, collapsed = false }) {
  const [isOpen, setIsOpen] = useState(!collapsed);

  if (!responses || responses.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-3 min-w-0">
      <CollapsibleTrigger className="flex items-center justify-between w-full px-3 sm:px-4 py-2.5 rounded-xl bg-card border border-border hover:bg-accent/50 transition-colors group">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <MessageSquare className="w-4 h-4 text-iris shrink-0" />
          <span className="text-sm font-semibold font-[--font-display] text-foreground truncate">
            Individual Responses
          </span>
          <Badge variant="secondary" className="text-xs font-normal shrink-0">
            {responses.length} models
          </Badge>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Tabs defaultValue="0">
            <div className="border-b border-border px-1 pt-1 overflow-x-auto scrollbar-hide">
              <TabsList className="h-auto p-0 bg-transparent gap-0 w-max min-w-full">
                {responses.map((resp, index) => (
                  <TabsTrigger
                    key={index}
                    value={String(index)}
                    className="rounded-t-lg rounded-b-none px-3 sm:px-4 py-2 text-xs font-medium whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary border-b-2 border-transparent"
                  >
                    {getModelShortName(resp.model)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {responses.map((resp, index) => (
              <TabsContent key={index} value={String(index)} className="m-0 p-0 min-w-0">
                <div className="px-2 pt-2 overflow-hidden">
                  <span className="text-[11px] font-mono text-muted-foreground px-2 block truncate">
                    {resp.model}
                  </span>
                </div>
                <div className="p-2 min-w-0">
                  <div className="markdown-content text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{resp.response}</ReactMarkdown>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
