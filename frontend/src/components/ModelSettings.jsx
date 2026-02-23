import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Settings, RotateCcw, Crown, Users } from 'lucide-react';

const MODEL_INFO = {
  'google/gemini-3.1-pro-preview': { name: 'Gemini 3.1 Pro', provider: 'Google' },
  'anthropic/claude-sonnet-4.6': { name: 'Claude Sonnet 4.6', provider: 'Anthropic' },
  'openai/gpt-5.2': { name: 'GPT-5.2', provider: 'OpenAI' },
  'anthropic/claude-opus-4.5': { name: 'Claude Opus 4.5', provider: 'Anthropic' },
  'x-ai/grok-4.1-fast': { name: 'Grok 4.1 Fast', provider: 'xAI' },
};

function modelDisplayName(modelId) {
  return MODEL_INFO[modelId]?.name || modelId.split('/').pop();
}

function modelProvider(modelId) {
  return MODEL_INFO[modelId]?.provider || modelId.split('/')[0];
}

export default function ModelSettings({
  availableModels,
  councilModels,
  chairmanModel,
  onToggleCouncil,
  onSetChairman,
  onReset,
  isCustom,
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="relative p-1.5 rounded-lg hover:bg-muted transition-colors"
          title="Model Settings"
        >
          <Settings className="w-4 h-4 text-muted-foreground" />
          {isCustom && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary" />
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px] gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="font-[--font-display] text-xl font-bold tracking-tight">
            Model Settings
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground font-[--font-body]">
            Configure which models participate in the council deliberation.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-6 pb-2">
          {/* Council Members */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold font-[--font-display] text-foreground">
                Council Members
              </h3>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-[--font-body]">
                {councilModels.length} selected
              </Badge>
            </div>
            <div className="grid gap-1.5">
              {availableModels.map((model) => {
                const checked = councilModels.includes(model);
                const disabled = checked && councilModels.length <= 2;
                return (
                  <label
                    key={model}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-all ${
                      checked
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-transparent bg-muted/50 hover:bg-muted'
                    } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={disabled}
                      onCheckedChange={() => onToggleCouncil(model)}
                    />
                    <div className="flex-1 min-w-0 flex items-baseline gap-2">
                      <span className="text-sm font-medium font-[--font-body] truncate">
                        {modelDisplayName(model)}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-[--font-body]">
                        {modelProvider(model)}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <Separator className="mb-5" />

          {/* Chairman */}
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold font-[--font-display] text-foreground">
                Chairman
              </h3>
            </div>
            <div className="grid gap-1.5">
              {availableModels.map((model) => {
                const selected = chairmanModel === model;
                return (
                  <label
                    key={model}
                    onClick={() => onSetChairman(model)}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-all ${
                      selected
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-transparent bg-muted/50 hover:bg-muted'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        selected ? 'border-primary' : 'border-muted-foreground/30'
                      }`}
                    >
                      {selected && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex items-baseline gap-2">
                      <span className="text-sm font-medium font-[--font-body] truncate">
                        {modelDisplayName(model)}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-[--font-body]">
                        {modelProvider(model)}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
          <p className="text-[11px] text-muted-foreground font-[--font-body]">
            {isCustom ? 'Using custom configuration' : 'Using default configuration'}
          </p>
          {isCustom && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 h-8 text-xs font-[--font-body]"
              onClick={onReset}
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
