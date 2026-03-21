import {
  ChatwootHistoryCandidateConversation,
  ChatwootHistoryExecutionStatus,
  ChatwootHistoryJobContact,
  ChatwootHistoryJobStatus,
  ChatwootReviewPayload,
  ChatwootUnsafeReason,
} from "@/lib/queries/chatwoot/types";

import { Chat as ChatType } from "@/types/evolution.types";

export const classificationLabels = {
  eligible: "Elegivel",
  needs_review: "Conflito",
  lid_alias: "Alias @lid",
  requires_rebuild: "Precisa rebuild",
  ignored: "Ignorado",
} as const;

export const suggestedActionLabels = {
  import_direct: "Importar direto",
  create_rebuild: "Rebuild + merge",
  open_chatwoot: "Abrir no Chatwoot",
  ignore: "Ignorar",
} as const;

export const executionLabels: Record<ChatwootHistoryExecutionStatus, string> = {
  pending: "Pendente",
  completed: "Concluido",
  failed: "Falhou",
  skipped: "Ignorado",
};

export const jobStatusLabels: Record<ChatwootHistoryJobStatus, string> = {
  pending: "Pendente",
  analyzing: "Analisando",
  awaiting_execution: "Aguardando execucao",
  running: "Executando",
  completed: "Concluido",
  failed: "Falhou",
  partial: "Parcial",
};

export const jobModeLabels = {
  dryRun: "Dry run",
  importDirect: "Importacao direta",
  rebuild: "Rebuild + merge",
} as const;

export const scopeLabels = {
  single: "Contato unico",
  selected: "Selecionados",
  eligibleAll: "Todos elegiveis",
} as const;

export const scopeDescriptions = {
  single: "Analisa um contato especifico.",
  selected: "Analisa uma lista escolhida manualmente.",
  eligibleAll: "Analisa todos os contatos conhecidos da instancia.",
} as const;

export const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString("pt-BR") : "--");

export const getDisplayName = (item: Pick<ChatType, "pushName" | "remoteJid"> | Pick<ChatwootHistoryJobContact, "pushName" | "remoteJid">) =>
  item.pushName || item.remoteJid.split("@")[0];

export const getReviewPayload = (contact: ChatwootHistoryJobContact): ChatwootReviewPayload | null => contact.report?.review || null;
export const getConsolidation = (contact: ChatwootHistoryJobContact) => contact.report?.consolidation || null;

export const getConversationUrl = (contact: ChatwootHistoryJobContact) =>
  getReviewPayload(contact)?.chatwootReviewUrl || contact.report?.rebuiltConversationUrl || contact.report?.chatwootConversationUrl || null;

export const getUnsafeReasonLabel = (reason: ChatwootUnsafeReason) =>
  ({
    existing_conversation_overlap: "Overlap com conversa existente",
    lid_alias_detected: "Alias @lid detectado",
    multiple_candidate_conversations: "Multiplas conversas candidatas",
    source_id_collision_risk: "Risco de colisao de source_id",
    chatwoot_history_already_present: "Historico ja presente no Chatwoot",
    identity_conflict: "Identidade canonica ambigua",
  })[reason];

export const getConversationSelection = (contact: ChatwootHistoryJobContact) => contact.report?.conversationSelection || null;

export const getCandidateConversations = (contact: ChatwootHistoryJobContact): ChatwootHistoryCandidateConversation[] =>
  getConversationSelection(contact)?.candidateConversations || [];

export const getRelatedInboxIds = (contact: ChatwootHistoryJobContact): number[] =>
  getConversationSelection(contact)?.relatedInboxIds || contact.report?.evidence?.relatedInboxIds || [];

export const getDefaultCanonicalConversationId = (contact: ChatwootHistoryJobContact) =>
  getConversationSelection(contact)?.selectedConversationInternalId || contact.selectedConversationId || null;

export const getCandidateConversationByInternalId = (contact: ChatwootHistoryJobContact, internalId?: number | null) =>
  getCandidateConversations(contact).find((candidate) => candidate.internalId === internalId) || null;

export const getConversationStatusLabel = (status: ChatwootHistoryCandidateConversation["status"]) =>
  ({
    open: "Aberta",
    resolved: "Resolvida",
    pending: "Pendente",
    snoozed: "Adiada",
    unknown: "Desconhecida",
  })[status];

export const getConversationStatusVariant = (status: ChatwootHistoryCandidateConversation["status"]) => {
  if (status === "open") return "secondary";
  if (status === "resolved") return "outline";
  if (status === "pending" || status === "snoozed") return "warning";
  return "outline";
};

export const buildConflictSummary = (contact: ChatwootHistoryJobContact) => {
  const fragments: string[] = [];
  const candidateConversations = getCandidateConversations(contact);
  const relatedInboxIds = getRelatedInboxIds(contact);

  if (contact.overlapCount > 0) {
    fragments.push(`${contact.overlapCount} mensagem(ns) ja existem no Chatwoot`);
  }
  if (candidateConversations.length > 1) {
    fragments.push(`${candidateConversations.length} conversas candidatas no inbox alvo`);
  } else if (candidateConversations.length === 1) {
    fragments.push(`1 conversa candidata no inbox alvo`);
  }
  if (relatedInboxIds.length > 0) {
    fragments.push(`historico visto nas inboxes ${relatedInboxIds.join(", ")}`);
  }
  if (contact.report?.evidence?.sourceIdCollisionRisk) {
    fragments.push("ha risco de colisao de source_id");
  }
  if (contact.chatwootMessageCount > 0) {
    fragments.push("o merge deve preservar a midia ja salva no Chatwoot");
  }

  return fragments.join(" • ");
};

export const statusBadgeVariant = (status: string) => {
  if (status === "completed") return "secondary";
  if (status === "failed") return "destructive";
  if (status === "running" || status === "analyzing" || status === "partial") return "warning";
  return "outline";
};

export const classificationBadgeVariant = (classification: ChatwootHistoryJobContact["classification"]) => {
  if (classification === "eligible") return "secondary";
  if (classification === "ignored") return "outline";
  if (classification === "needs_review" || classification === "requires_rebuild") return "warning";
  return "destructive";
};

export const classificationBorderColor = (classification: ChatwootHistoryJobContact["classification"]) => {
  if (classification === "eligible") return "border-l-green-500";
  if (classification === "requires_rebuild") return "border-l-amber-500";
  if (classification === "needs_review") return "border-l-orange-500";
  if (classification === "ignored") return "border-l-gray-400";
  if (classification === "lid_alias") return "border-l-purple-500";
  return "";
};

export const getContactSelectionKey = (contact: Pick<ChatwootHistoryJobContact, "jobId" | "remoteJid">) => `${contact.jobId}:${contact.remoteJid}`;
