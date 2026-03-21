import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { ChatwootHistoryCandidateConversation, ChatwootHistoryJobContact } from "@/lib/queries/chatwoot/types";
import { cn } from "@/lib/utils";

import { formatDateTime, getConversationStatusLabel, getConversationStatusVariant } from "./helpers";

type ConversationSelectorProps = {
  contact: ChatwootHistoryJobContact;
  candidateConversations: ChatwootHistoryCandidateConversation[];
  selectedCanonicalConversationId: number | null | undefined;
  onSelectCanonical: (contact: ChatwootHistoryJobContact, internalId: number | null) => void;
  onOpenExternal: (url?: string | null) => void;
};

export function ConversationSelector({
  contact,
  candidateConversations,
  selectedCanonicalConversationId,
  onSelectCanonical,
  onOpenExternal,
}: ConversationSelectorProps) {
  if (candidateConversations.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">Escolha a conversa canonica:</div>
      <div className="space-y-2">
        {candidateConversations.map((candidate) => {
          const isCanonical = selectedCanonicalConversationId === candidate.internalId;

          return (
            <button
              key={`${contact.jobId}:${contact.remoteJid}:candidate:${candidate.internalId}`}
              type="button"
              onClick={() => onSelectCanonical(contact, candidate.internalId)}
              className={cn(
                "w-full rounded-md border p-3 text-left transition-colors",
                isCanonical ? "border-primary bg-primary/5" : "bg-background hover:border-primary/40",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={cn("h-3 w-3 rounded-full border-2", isCanonical ? "border-primary bg-primary" : "border-muted-foreground")} />
                  <span className="font-medium">#{candidate.displayId}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={getConversationStatusVariant(candidate.status) as "secondary" | "outline" | "warning"}>
                    {getConversationStatusLabel(candidate.status)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{candidate.messageCount} msgs</span>
                  {candidate.attachmentMessageCount > 0 && (
                    <span className="text-xs text-muted-foreground">{candidate.attachmentMessageCount} midia</span>
                  )}
                  {candidate.reviewUrl && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-6 px-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenExternal(candidate.reviewUrl);
                      }}
                    >
                      <ArrowUpRight className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-1.5 flex gap-3 text-xs text-muted-foreground">
                <span>Inbox {candidate.inboxId || "--"}</span>
                <span>{formatDateTime(candidate.firstMessageAt)} – {formatDateTime(candidate.lastMessageAt || candidate.lastActivityAt)}</span>
              </div>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => onSelectCanonical(contact, null)}
        className={cn(
          "w-full rounded-md border border-dashed p-2.5 text-left text-sm transition-colors",
          !selectedCanonicalConversationId ? "border-primary bg-primary/5" : "hover:border-primary/40",
        )}
      >
        <div className="flex items-center gap-2">
          <div className={cn("h-3 w-3 rounded-full border-2", !selectedCanonicalConversationId ? "border-primary bg-primary" : "border-muted-foreground")} />
          <span>Criar nova conversa canonica</span>
        </div>
      </button>
      <div className="text-xs text-muted-foreground">
        {selectedCanonicalConversationId
          ? "A canonica vai preservar a midia e receber so os extras."
          : "Sem escolha explicita, o merge pode criar uma nova conversa canonica."}
      </div>
    </div>
  );
}
