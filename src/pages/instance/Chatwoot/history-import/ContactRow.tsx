import { AlertTriangle, CheckCircle2, ChevronDown, Search } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { ChatwootHistoryCandidateConversation, ChatwootHistoryJobContact } from "@/lib/queries/chatwoot/types";
import { cn } from "@/lib/utils";

import { ConversationSelector } from "./ConversationSelector";
import {
  buildConflictSummary,
  classificationBadgeVariant,
  classificationBorderColor,
  classificationLabels,
  executionLabels,
  getConsolidation,
  getDisplayName,
  getReviewPayload,
  getUnsafeReasonLabel,
  statusBadgeVariant,
} from "./helpers";

type ContactAction = "importDirect" | "createRebuild" | "ignore" | "openChatwootReview" | "resolveLid";

type ContactRowProps = {
  contact: ChatwootHistoryJobContact;
  isSelected: boolean;
  candidateConversations: ChatwootHistoryCandidateConversation[];
  selectedCanonicalConversationId: number | null | undefined;
  onToggleSelection: (remoteJid: string) => void;
  onSelectCanonical: (contact: ChatwootHistoryJobContact, internalId: number | null) => void;
  onContactAction: (contact: ChatwootHistoryJobContact, action: ContactAction) => void;
  onOpenMergeDialog: (contact: ChatwootHistoryJobContact) => void;
  onOpenExternal: (url?: string | null) => void;
  selectable?: boolean;
  showJob?: boolean;
};

export function ContactRow({
  contact,
  isSelected,
  candidateConversations,
  selectedCanonicalConversationId,
  onToggleSelection,
  onSelectCanonical,
  onContactAction,
  onOpenMergeDialog,
  onOpenExternal,
  selectable = true,
  showJob = false,
}: ContactRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const reviewPayload = getReviewPayload(contact);
  const consolidation = getConsolidation(contact);
  const conflictSummary = buildConflictSummary(contact);

  const suggestedAction = contact.suggestedAction;
  const isPrimary = (action: string) => {
    if (suggestedAction === "import_direct" && action === "importDirect") return true;
    if (suggestedAction === "create_rebuild" && action === "createRebuild") return true;
    return false;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn("rounded-lg border border-l-4 transition-colors", classificationBorderColor(contact.classification), isOpen && "bg-muted/30")}>
        {/* Collapsed summary row */}
        <div className="flex items-center gap-3 px-3 py-2.5">
          {selectable && (
            <input
              checked={isSelected}
              className="h-4 w-4 shrink-0 accent-primary"
              type="checkbox"
              onChange={() => onToggleSelection(contact.remoteJid)}
            />
          )}

          <div className="flex min-w-0 flex-1 items-center gap-3">
            {/* Name + JID */}
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-sm">{getDisplayName(contact)}</div>
              <div className="truncate text-xs text-muted-foreground">{contact.remoteJid}</div>
            </div>

            {/* Classification badge + safe icon */}
            <div className="flex shrink-0 items-center gap-1.5">
              <Badge variant={classificationBadgeVariant(contact.classification) as "secondary" | "outline" | "warning" | "destructive"} className="text-[10px]">
                {classificationLabels[contact.classification]}
              </Badge>
              {contact.isSafeDirectImport ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              )}
            </div>

            {/* Compact metrics: Evo|CW|Overlap */}
            <div className="hidden shrink-0 items-center gap-0.5 text-xs font-mono sm:flex">
              <span className="text-blue-500">{contact.evolutionMessageCount}</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-green-500">{contact.chatwootMessageCount}</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-amber-500">{contact.overlapCount}</span>
            </div>

            {/* Status badge */}
            <Badge variant={statusBadgeVariant(contact.executionStatus) as "secondary" | "outline" | "warning" | "destructive"} className="shrink-0 text-[10px]">
              {executionLabels[contact.executionStatus]}
            </Badge>

            {showJob && contact.Job && (
              <span className="shrink-0 text-xs text-muted-foreground">{contact.Job.mode}</span>
            )}
          </div>

          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 shrink-0 p-0">
              <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
        </div>

        {/* Expanded detail panel */}
        <CollapsibleContent>
          <div className="border-t px-3 py-3">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Left: Metrics + Identity */}
              <div className="space-y-3">
                <div className="text-xs font-medium text-muted-foreground">Metricas</div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-md border p-2 text-center">
                    <div className="text-xs text-muted-foreground">Evolution</div>
                    <div className="font-semibold text-blue-500">{contact.evolutionMessageCount}</div>
                  </div>
                  <div className="rounded-md border p-2 text-center">
                    <div className="text-xs text-muted-foreground">Chatwoot</div>
                    <div className="font-semibold text-green-500">{contact.chatwootMessageCount}</div>
                  </div>
                  <div className="rounded-md border p-2 text-center">
                    <div className="text-xs text-muted-foreground">Overlap</div>
                    <div className="font-semibold text-amber-500">{contact.overlapCount}</div>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>Identidade: {contact.canonicalIdentityType} / {contact.identityResolutionStatus}</div>
                  <div>phoneJid: {contact.phoneJid || "--"}</div>
                  <div>lidJid: {contact.lidJid || "--"}</div>
                  {reviewPayload?.chatwootContactId && <div>Contato CW: {reviewPayload.chatwootContactId}</div>}
                  {consolidation?.movedChatwootMessageCount != null && consolidation.movedChatwootMessageCount > 0 && (
                    <div>Migradas: {consolidation.movedChatwootMessageCount}</div>
                  )}
                  {consolidation?.supersededConversationIds?.length ? (
                    <div>Supersedidas: {consolidation.supersededConversationIds.map((id) => `#${id}`).join(", ")}</div>
                  ) : null}
                </div>

                {contact.unsafeReasons.length > 0 && (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2">
                    <div className="text-xs font-medium text-amber-600">Motivos inseguros:</div>
                    <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                      {contact.unsafeReasons.map((reason) => (
                        <li key={reason}>• {getUnsafeReasonLabel(reason)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {conflictSummary && (
                  <div className="rounded-md border bg-muted/50 p-2 text-xs text-muted-foreground">
                    {conflictSummary}
                  </div>
                )}

                {contact.report?.execution?.warning && (
                  <div className="text-xs text-amber-600">{contact.report.execution.warning}</div>
                )}
                {contact.report?.execution?.error && (
                  <div className="text-xs text-destructive">{contact.report.execution.error}</div>
                )}
              </div>

              {/* Right: Conversation selector */}
              <div>
                {candidateConversations.length > 0 ? (
                  <ConversationSelector
                    contact={contact}
                    candidateConversations={candidateConversations}
                    selectedCanonicalConversationId={selectedCanonicalConversationId}
                    onSelectCanonical={onSelectCanonical}
                    onOpenExternal={onOpenExternal}
                  />
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Conversa</div>
                    <div className="text-xs text-muted-foreground">
                      {contact.rebuiltConversationId
                        ? `Rebuild: interna #${contact.rebuiltConversationId}`
                        : "Nenhuma conversa candidata"}
                    </div>
                    {reviewPayload?.chatwootReviewUrl && (
                      <div className="text-xs text-muted-foreground">
                        Review URL: {reviewPayload.chatwootReviewUrl}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
              <Button
                size="sm"
                variant={isPrimary("importDirect") ? "default" : "outline"}
                onClick={() => {
                  if (!contact.isSafeDirectImport) {
                    if (!window.confirm(`Este contato tem riscos: ${contact.unsafeReasons.map(getUnsafeReasonLabel).join(", ")}. Deseja forcar a importacao?`)) {
                      return;
                    }
                  }
                  onContactAction(contact, "importDirect");
                }}
              >
                Importar
              </Button>
              <Button
                size="sm"
                variant={isPrimary("createRebuild") ? "default" : "outline"}
                disabled={contact.classification === "ignored"}
                onClick={() => onOpenMergeDialog(contact)}
              >
                Rebuild + merge
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onContactAction(contact, "ignore")}>
                Ignorar
              </Button>
              {contact.hasLidAlias && !contact.phoneJid && (
                <Button size="sm" variant="outline" onClick={() => onContactAction(contact, "resolveLid")}>
                  <Search className="mr-1 h-3 w-3" />
                  Resolver LID
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => onContactAction(contact, "openChatwootReview")}>
                Chatwoot
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
