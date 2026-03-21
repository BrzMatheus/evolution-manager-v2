import { History, Search, ShieldAlert, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

import { ChatwootHistoryScopeType } from "@/lib/queries/chatwoot/types";
import { cn } from "@/lib/utils";

import { Chat as ChatType } from "@/types/evolution.types";

import { getDisplayName, scopeDescriptions, scopeLabels } from "./helpers";

type BulkHistoryInfo = {
  processedChats: number;
  totalChats: number;
  remainingChats: number;
  autoResume: boolean;
  nextBatchAt: string | null;
  totalNewMessages?: number;
  newMessagesPerChat?: Record<string, number>;
  lidMappingsFound?: Array<{ lid: string; phone: string }>;
};

type StepScopeProps = {
  isCollapsed: boolean;
  onToggleCollapsed: (open: boolean) => void;
  scopeType: ChatwootHistoryScopeType;
  onScopeTypeChange: (value: ChatwootHistoryScopeType) => void;
  selectionSearch: string;
  onSelectionSearchChange: (value: string) => void;
  filteredChats: ChatType[];
  selectedRemoteJids: string[];
  onToggleScopeSelection: (remoteJid: string) => void;
  onSelectAllScope: () => void;
  onClearScopeSelection: () => void;
  areAllScopeContactsSelected: boolean;
  bulkHistoryInfo: BulkHistoryInfo | null;
  bulkHistoryRunning: boolean;
  onFetchBulkHistory: (autoResume: boolean) => void;
  onCancelBulkHistory: () => void;
  onAnalyze: () => void;
};

export function StepScope({
  isCollapsed,
  onToggleCollapsed,
  scopeType,
  onScopeTypeChange,
  selectionSearch,
  onSelectionSearchChange,
  filteredChats,
  selectedRemoteJids,
  onToggleScopeSelection,
  onSelectAllScope,
  onClearScopeSelection,
  areAllScopeContactsSelected,
  bulkHistoryInfo,
  bulkHistoryRunning,
  onFetchBulkHistory,
  onCancelBulkHistory,
  onAnalyze,
}: StepScopeProps) {
  return (
    <Collapsible open={!isCollapsed} onOpenChange={(open) => onToggleCollapsed(!open)}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none hover:bg-accent/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">1. Selecione o escopo</CardTitle>
                <CardDescription>
                  {isCollapsed
                    ? `${scopeLabels[scopeType]}${selectedRemoteJids.length > 0 ? ` (${selectedRemoteJids.length} contatos)` : ""}`
                    : "Escolha quais contatos serao analisados no dry run."}
                </CardDescription>
              </div>
              <div className={cn("text-muted-foreground transition-transform", !isCollapsed && "rotate-180")}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Scope type selection */}
            <div className="grid gap-2 sm:grid-cols-3">
              {(["single", "selected", "eligibleAll"] as ChatwootHistoryScopeType[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onScopeTypeChange(value)}
                  className={cn(
                    "rounded-lg border px-4 py-3 text-left transition-colors",
                    scopeType === value ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn("h-3 w-3 rounded-full border-2", scopeType === value ? "border-primary bg-primary" : "border-muted-foreground")} />
                    <span className="font-medium text-sm">{scopeLabels[value]}</span>
                  </div>
                  <div className="mt-1 pl-5 text-xs text-muted-foreground">{scopeDescriptions[value]}</div>
                </button>
              ))}
            </div>

            {/* Contact selection list */}
            {scopeType !== "eligibleAll" && (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={selectionSearch}
                    onChange={(event) => onSelectionSearchChange(event.target.value)}
                    className="pl-9"
                    placeholder="Filtrar contatos por nome ou JID"
                  />
                </div>
                {scopeType !== "single" && (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={onSelectAllScope} disabled={filteredChats.length === 0}>
                      {areAllScopeContactsSelected ? "Desmarcar todos" : "Selecionar todos"}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={onClearScopeSelection} disabled={selectedRemoteJids.length === 0}>
                      Limpar selecao
                    </Button>
                  </div>
                )}
                <ScrollArea className="h-56 rounded-lg border">
                  <div className="space-y-0.5 p-2">
                    {filteredChats.map((chat) => {
                      const isSelected = selectedRemoteJids.includes(chat.remoteJid);
                      return (
                        <button
                          key={chat.id}
                          type="button"
                          onClick={() => onToggleScopeSelection(chat.remoteJid)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors",
                            isSelected ? "bg-primary/5" : "hover:bg-muted/50",
                          )}
                        >
                          <div>
                            <div className="text-sm font-medium">{getDisplayName(chat)}</div>
                            <div className="text-xs text-muted-foreground">{chat.remoteJid}</div>
                          </div>
                          <input
                            checked={isSelected}
                            readOnly
                            className="h-4 w-4 accent-primary"
                            type={scopeType === "single" ? "radio" : "checkbox"}
                          />
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </>
            )}

            {/* Bulk history status */}
            {bulkHistoryInfo && (bulkHistoryInfo.processedChats > 0 || bulkHistoryInfo.autoResume) && (
              <div className="rounded-lg border bg-muted/50 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Busca de historico</span>
                  {bulkHistoryInfo.autoResume && bulkHistoryInfo.nextBatchAt && (
                    <span className="text-xs text-muted-foreground">
                      Proximo batch: {new Date(bulkHistoryInfo.nextBatchAt).toLocaleString("pt-BR")}
                    </span>
                  )}
                </div>
                {/* Progress bar */}
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${bulkHistoryInfo.totalChats > 0 ? Math.round((bulkHistoryInfo.processedChats / bulkHistoryInfo.totalChats) * 100) : 0}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {bulkHistoryInfo.processedChats}/{bulkHistoryInfo.totalChats} chats
                  {bulkHistoryInfo.remainingChats > 0 ? ` • ${bulkHistoryInfo.remainingChats} restantes` : " • Concluido"}
                  {bulkHistoryInfo.totalNewMessages ? ` • +${bulkHistoryInfo.totalNewMessages} novas msgs` : ""}
                </div>
                {bulkHistoryInfo.lidMappingsFound && bulkHistoryInfo.lidMappingsFound.length > 0 && (
                  <div className="mt-2 rounded border bg-green-50 p-2 text-xs dark:bg-green-950">
                    <span className="font-medium text-green-700 dark:text-green-400">
                      {bulkHistoryInfo.lidMappingsFound.length} mapeamento(s) LID → Phone
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => onFetchBulkHistory(false)} disabled={bulkHistoryRunning}>
                  <History className={cn("mr-1.5 h-3.5 w-3.5", bulkHistoryRunning && "animate-spin")} />
                  {bulkHistoryRunning ? "Buscando..." : "Buscar batch"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => onFetchBulkHistory(true)} disabled={bulkHistoryRunning}>
                  <History className={cn("mr-1.5 h-3.5 w-3.5", bulkHistoryRunning && "animate-spin")} />
                  Automatico
                </Button>
                {(bulkHistoryRunning || bulkHistoryInfo?.autoResume) && (
                  <Button type="button" variant="destructive" size="icon" className="h-8 w-8" onClick={onCancelBulkHistory} title="Cancelar busca">
                    <XCircle className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="flex-1" />
              <Button type="button" onClick={onAnalyze}>
                <ShieldAlert className="mr-1.5 h-4 w-4" />
                Gerar previa (Dry Run)
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
