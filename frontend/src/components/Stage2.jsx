import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { getModelShortName } from '../utils';
import { Shield, ChevronDown, Trophy } from 'lucide-react';

function deAnonymizeText(text, labelToModel) {
  if (!labelToModel) return text;
  let result = text;
  for (const [label, model] of Object.entries(labelToModel)) {
    result = result.replace(new RegExp(label, 'g'), `**${getModelShortName(model)}**`);
  }
  return result;
}

export default function Stage2({ rankings, labelToModel, aggregateRankings, collapsed = false }) {
  const [isOpen, setIsOpen] = useState(!collapsed);

  if (!rankings || rankings.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-3">
      <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-card border border-border hover:bg-accent/50 transition-colors group">
        <div className="flex items-center gap-2.5">
          <Shield className="w-4 h-4 text-wisteria" />
          <span className="text-sm font-semibold font-[--font-display] text-foreground">
            Peer Review
          </span>
          <Badge variant="secondary" className="text-xs font-normal">
            {rankings.length} evaluations
          </Badge>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2 space-y-3">
        {/* Aggregate Rankings */}
        {aggregateRankings && aggregateRankings.length > 0 && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold font-[--font-display] text-foreground">
                Aggregate Rankings
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Combined results across all peer evaluations (lower score = better):
            </p>
            <div className="space-y-1.5">
              {aggregateRankings.map((agg, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg bg-card/80 border border-border"
                >
                  <span className={`
                    w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0
                    ${index === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                  `}>
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium text-foreground flex-1 truncate">
                    {getModelShortName(agg.model)}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    Avg: {agg.average_rank.toFixed(2)}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-normal shrink-0 hidden sm:inline-flex">
                    {agg.rankings_count} votes
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Raw Evaluations */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Each model evaluated anonymized responses (A, B, C...) and ranked them.
              Model names shown in <strong>bold</strong> are de-anonymized for readability.
            </p>
          </div>

          <Tabs defaultValue="0">
            <div className="border-b border-border px-1 pt-1 overflow-x-auto scrollbar-hide">
              <TabsList className="h-auto p-0 bg-transparent gap-0 w-max min-w-full">
                {rankings.map((rank, index) => (
                  <TabsTrigger
                    key={index}
                    value={String(index)}
                    className="rounded-t-lg rounded-b-none px-3 sm:px-4 py-2 text-xs font-medium whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary border-b-2 border-transparent"
                  >
                    {getModelShortName(rank.model)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {rankings.map((rank, index) => {
              const parsedRanking = rank.parsed_ranking || [];
              return (
                <TabsContent key={index} value={String(index)} className="m-0 p-0">
                  <div className="px-2 pt-2">
                    <span className="text-[11px] font-mono text-muted-foreground px-2">
                      {rank.model}
                    </span>
                  </div>
                  <div className="p-2">
                    <div className="markdown-content text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {deAnonymizeText(rank.ranking, labelToModel)}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {parsedRanking.length > 0 && (
                    <div className="mx-4 mb-4 px-3 py-2.5 rounded-lg bg-muted/50 border border-border">
                      <p className="text-xs font-semibold text-foreground mb-1.5">Extracted Ranking:</p>
                      <ol className="list-decimal list-inside space-y-0.5">
                        {parsedRanking.map((label, i) => (
                          <li key={i} className="text-xs text-muted-foreground">
                            {labelToModel?.[label]
                              ? getModelShortName(labelToModel[label])
                              : label}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
