import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getModelShortName } from '../utils';
import { Badge } from '@/components/ui/badge';
import { Scale, Crown } from 'lucide-react';

export default function Stage3({ finalResponse }) {
  if (!finalResponse) return null;

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.03] to-wisteria/[0.05] overflow-hidden mb-3 min-w-0">
      <div className="flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-3 border-b border-primary/10">
        <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center shrink-0">
          <Scale className="w-3 h-3 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold font-[--font-display] text-foreground truncate">
          Council's Answer
        </span>
        <Badge variant="outline" className="text-[10px] font-normal border-primary/30 text-primary ml-auto shrink-0">
          <Crown className="w-2.5 h-2.5 mr-1" />
          {getModelShortName(finalResponse.model)}
        </Badge>
      </div>
      <div className="p-2 min-w-0">
        <div className="markdown-content text-sm leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{finalResponse.response}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
