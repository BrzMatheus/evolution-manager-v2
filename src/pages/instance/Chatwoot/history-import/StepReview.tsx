import { Download, Search, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { ChatwootHistoryJob, ChatwootHistoryJobContact } from "@/lib/queries/chatwoot/types";

import { BulkActionBar } from "./BulkActionBar";
import { ContactRow } from "./ContactRow";
import { getCandidateConversations, getContactSelectionKey, getDefaultCanonicalConversationId } from "./helpers";
import { SummaryDashboard } from "./SummaryDashboard";

type ContactAction = "importDirect" | "createRebuild" | "ignore" | "openChatwootReview" | "resolveLid";

type StepReviewProps = {
  selectedJob: ChatwootHistoryJob | null | undefined;
  visibleContacts: ChatwootHistoryJobContact[];
  classificationFilter: string;
  onClassificationFilterChange: (value: string) => void;
  selectedPreviewRemoteJids: string[];
  onTogglePreviewSelection: (remoteJid: string) => void;
  onSelectAllPreview: () => void;
  onClearPreviewSelection: () => void;
  areAllPreviewContactsSelected: boolean;
  selectedCanonicalConversationIds: Record<string, number>;
  onSelectCanonical: (contact: ChatwootHistoryJobContact, internalId: number | null) => void;
  onContactAction: (contact: ChatwootHistoryJobContact, action: ContactAction) => void;
  onOpenMergeDialog: (contact: ChatwootHistoryJobContact) => void;
  onOpenExternal: (url?: string | null) => void;
  onImportEligible: () => void;
  onImportSelected: () => void;
  onRebuildSelected: () => void;
  onSelectRequiresRebuild: () => void;
  onDownloadCsv: (jobId: string) => void;
};

export function StepReview({
  selectedJob,
  visibleContacts,
  classificationFilter,
  onClassificationFilterChange,
  selectedPreviewRemoteJids,
  onTogglePreviewSelection,
  onSelectAllPreview,
  onClearPreviewSelection,
  areAllPreviewContactsSelected,
  selectedCanonicalConversationIds,
  onSelectCanonical,
  onContactAction,
  onOpenMergeDialog,
  onOpenExternal,
  onImportEligible,
  onImportSelected,
  onRebuildSelected,
  onSelectRequiresRebuild,
  onDownloadCsv,
}: StepReviewProps) {
  if (!selectedJob) {
    return (
      <Card>
        <CardContent className="py-16">
          <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
            <Search className="h-10 w-10 text-muted-foreground/50" />
            <div className="text-sm">Execute um dry run no passo anterior para gerar a previa dos contatos.</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getSelectedCanonicalConversationId = (contact: ChatwootHistoryJobContact) =>
    selectedCanonicalConversationIds[getContactSelectionKey(contact)] ?? getDefaultCanonicalConversationId(contact);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">2. Revise os contatos</CardTitle>
              <CardDescription>Expanda cada contato para ver detalhes, resolver conflitos e executar acoes.</CardDescription>
            </div>
            {selectedJob.id && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onDownloadCsv(selectedJob.id)}>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                CSV
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary cards */}
          <SummaryDashboard
            summary={selectedJob.summary}
            classificationFilter={classificationFilter}
            onFilterChange={onClassificationFilterChange}
          />

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={classificationFilter} onValueChange={onClassificationFilterChange}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="eligible">Elegiveis</SelectItem>
                <SelectItem value="needs_review">Conflito</SelectItem>
                <SelectItem value="requires_rebuild">Rebuild</SelectItem>
                <SelectItem value="lid_alias">Alias @lid</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="sm" onClick={onSelectAllPreview} disabled={visibleContacts.length === 0}>
              {areAllPreviewContactsSelected ? "Desmarcar" : "Selecionar todas"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onSelectRequiresRebuild}
              disabled={!selectedJob.summary?.requiresRebuild}
            >
              <Wand2 className="mr-1.5 h-3.5 w-3.5" />
              Selecionar rebuilds
            </Button>
          </div>

          {/* Contact list */}
          {visibleContacts.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              Nenhum contato encontrado com esse filtro.
            </div>
          ) : (
            <div className="space-y-2">
              {visibleContacts.map((contact) => (
                <ContactRow
                  key={`${contact.jobId}:${contact.remoteJid}`}
                  contact={contact}
                  isSelected={selectedPreviewRemoteJids.includes(contact.remoteJid)}
                  candidateConversations={getCandidateConversations(contact)}
                  selectedCanonicalConversationId={getSelectedCanonicalConversationId(contact)}
                  onToggleSelection={onTogglePreviewSelection}
                  onSelectCanonical={onSelectCanonical}
                  onContactAction={onContactAction}
                  onOpenMergeDialog={onOpenMergeDialog}
                  onOpenExternal={onOpenExternal}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sticky bulk action bar */}
      <BulkActionBar
        selectedCount={selectedPreviewRemoteJids.length}
        hasJobId={Boolean(selectedJob.id)}
        onImportEligible={onImportEligible}
        onImportSelected={onImportSelected}
        onRebuildSelected={onRebuildSelected}
        onClearSelection={onClearPreviewSelection}
      />
    </div>
  );
}
