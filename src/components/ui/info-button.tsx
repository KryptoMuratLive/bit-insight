import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface InfoButtonProps {
  title: string;
  content: {
    description: string;
    howToRead: string[];
    tradingSignals: string[];
    bestPractices: string[];
    riskWarning?: string;
  };
}

export function InfoButton({ title, content }: InfoButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
        >
          <Info className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            {title} - Trading Guide
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Description */}
            <div>
              <h3 className="font-semibold text-sm mb-2">Was ist {title}?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {content.description}
              </p>
            </div>

            {/* How to Read */}
            <div>
              <h3 className="font-semibold text-sm mb-2">Wie interpretiere ich die Signale?</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {content.howToRead.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Trading Signals */}
            <div>
              <h3 className="font-semibold text-sm mb-2">Trading Signale</h3>
              <ul className="space-y-1 text-sm">
                {content.tradingSignals.map((signal, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">►</span>
                    <span className="text-muted-foreground">{signal}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Best Practices */}
            <div>
              <h3 className="font-semibold text-sm mb-2">Best Practices</h3>
              <ul className="space-y-1 text-sm">
                {content.bestPractices.map((practice, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">✓</span>
                    <span className="text-muted-foreground">{practice}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Risk Warning */}
            {content.riskWarning && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <h3 className="font-semibold text-sm mb-2 text-destructive">⚠️ Risiko-Hinweis</h3>
                <p className="text-sm text-muted-foreground">
                  {content.riskWarning}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}