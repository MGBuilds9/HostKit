"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

interface RenderedMessage {
  id: string;
  name: string;
  triggerDescription: string | null;
  body: string;
}

interface MessagePreviewProps {
  msg: RenderedMessage;
  copiedId: string | null;
  onCopy: (id: string, body: string) => void;
}

export function MessagePreview({ msg, copiedId, onCopy }: MessagePreviewProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-sm font-medium">{msg.name}</CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="h-12 w-full md:h-8 md:w-auto"
            onClick={() => onCopy(msg.id, msg.body)}
          >
            {copiedId === msg.id ? (
              <Check className="h-4 w-4 md:h-3 md:w-3 mr-1" />
            ) : (
              <Copy className="h-4 w-4 md:h-3 md:w-3 mr-1" />
            )}
            {copiedId === msg.id ? "Copied!" : "Copy"}
          </Button>
        </div>
        {msg.triggerDescription && (
          <p className="text-xs text-muted-foreground">{msg.triggerDescription}</p>
        )}
      </CardHeader>
      <CardContent>
        <pre className="whitespace-pre-wrap text-base md:text-sm bg-muted rounded-lg p-4 font-sans">
          {msg.body}
        </pre>
      </CardContent>
    </Card>
  );
}
