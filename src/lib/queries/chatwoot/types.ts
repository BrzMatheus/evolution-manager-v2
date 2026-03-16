import { Chatwoot } from "@/types/evolution.types";

export type FetchChatwoot = Chatwoot & {
  webhook_url?: string;
};

export type ChatwootHistoryScopeType = "single" | "selected" | "eligibleAll";
export type ChatwootHistoryJobStatus =
  | "pending"
  | "analyzing"
  | "awaiting_execution"
  | "running"
  | "completed"
  | "failed"
  | "partial";
export type ChatwootHistoryJobMode = "dryRun" | "importDirect" | "rebuild";
export type ChatwootHistoryClassification = "eligible" | "needs_review" | "lid_alias" | "requires_rebuild" | "ignored";
export type ChatwootHistorySuggestedAction = "import_direct" | "create_rebuild" | "open_chatwoot" | "ignore";
export type ChatwootHistoryExecutionStatus = "pending" | "completed" | "failed" | "skipped";
export type ChatwootUnsafeReason =
  | "existing_conversation_overlap"
  | "lid_alias_detected"
  | "multiple_candidate_conversations"
  | "source_id_collision_risk"
  | "chatwoot_history_already_present"
  | "identity_conflict";
export type ChatwootCanonicalIdentityType = "s_whatsapp_net" | "unresolved";
export type ChatwootIdentityResolutionStatus = "resolved" | "alias_only" | "ambiguous";

export type ChatwootHistoryJobSummary = {
  totalContacts: number;
  safeDirectImport: number;
  eligible: number;
  needsReview: number;
  lidAlias: number;
  requiresRebuild: number;
  ignored: number;
  completed?: number;
  failed?: number;
  skipped?: number;
  imported?: number;
  rebuilt?: number;
  totalsByClassification: Record<ChatwootHistoryClassification, number>;
  totalsBySuggestedAction: Record<ChatwootHistorySuggestedAction, number>;
  totalsByExecutionStatus?: Record<ChatwootHistoryExecutionStatus, number>;
};

export type ChatwootHistoryJobFilters = {
  sourceJobId?: string;
  selectionMode?: "allSafe" | "selected";
  remoteJids?: string[];
};

export type ChatwootReviewPayload = {
  chatwootAccountId: string | null;
  chatwootInboxId: number | null;
  chatwootContactId: number | null;
  chatwootConversationId: number | null;
  chatwootReviewUrl: string | null;
  chatwootFallbackUrl: string | null;
};

export type ChatwootHistoryCandidateConversation = {
  internalId: number;
  displayId: number;
  inboxId?: number | null;
  status: "open" | "resolved" | "pending" | "snoozed" | "unknown";
  messageCount: number;
  attachmentMessageCount: number;
  overlapCount: number;
  sourceIdCollisionRisk: boolean;
  firstMessageAt?: string | null;
  lastMessageAt?: string | null;
  lastActivityAt?: string | null;
  matchedCanonicalSourceIds?: string[];
  matchedFallbackSignatures?: string[];
  reviewUrl?: string | null;
};

export type ChatwootHistoryContactReport = {
  aliases?: string[];
  diagnosis?: {
    classification: ChatwootHistoryClassification;
    suggestedAction: ChatwootHistorySuggestedAction;
    isSafeDirectImport: boolean;
    unsafeReasons: ChatwootUnsafeReason[];
    canonicalIdentityType: ChatwootCanonicalIdentityType;
    identityResolutionStatus: ChatwootIdentityResolutionStatus;
  };
  decision?: {
    suggestedAction?: ChatwootHistorySuggestedAction;
    appliedAction?: ChatwootHistorySuggestedAction | "ignore" | null;
    appliedAt?: string;
  };
  evidence?: {
    hasLidAlias?: boolean;
    candidateConversationIds?: number[];
    candidateConversationDisplayIds?: number[];
    relatedInboxIds?: number[];
    matchedCanonicalSourceIds?: string[];
    matchedFallbackSignatures?: string[];
    sourceIdCollisionRisk?: boolean;
  };
  conversationSelection?: {
    selectedConversationInternalId?: number | null;
    selectedConversationDisplayId?: number | null;
    relatedInboxIds?: number[];
    candidateConversations?: ChatwootHistoryCandidateConversation[];
  };
  overlapMetrics?: {
    evolutionMessageCount?: number;
    chatwootMessageCount?: number;
    overlapCount?: number;
  };
  timeWindows?: {
    evolution?: {
      firstMessageTimestamp?: number | null;
      lastMessageTimestamp?: number | null;
    };
    chatwoot?: {
      firstMessageAt?: string | null;
      lastMessageAt?: string | null;
    };
  };
  review?: ChatwootReviewPayload;
  dedupeStrategy?: {
    canonicalSourceId?: string;
    equivalentSourceIds?: string[];
    fallback?: string;
    collisionPreference?: string;
  };
  executor?: {
    kind: string;
    manualFirst: boolean;
    officialChatwootExecutor: boolean;
    writesDirectlyToChatwootDatabase: boolean;
  };
  execution?: {
    status?: ChatwootHistoryExecutionStatus;
    error?: string | null;
    warning?: string | null;
    finishedAt?: string;
  };
  consolidation?: {
    strategy?: string;
    candidateConversationIds?: number[];
    candidateConversationDisplayIds?: number[];
    canonicalConversationInternalId?: number | null;
    canonicalConversationDisplayId?: number | null;
    supersededConversationIds?: number[];
    movedChatwootMessageCount?: number;
    resolvedSupersededConversationIds?: number[];
    failedSupersededConversationIds?: number[];
  };
  chatwootConversationUrl?: string | null;
  rebuiltConversationUrl?: string | null;
  [key: string]: unknown;
};

export type ChatwootHistoryJobReport = {
  aggregated?: {
    classifications?: Record<ChatwootHistoryClassification, number>;
    suggestedActions?: Record<ChatwootHistorySuggestedAction, number>;
    executionStatuses?: Record<ChatwootHistoryExecutionStatus, number> | null;
    safeDirectImport?: number;
  };
  execution?: {
    mode?: ChatwootHistoryJobMode;
    jobStatus?: ChatwootHistoryJobStatus;
    sourceJobId?: string | null;
    selectionMode?: "allSafe" | "selected" | null;
    startedAt?: string | null;
    finishedAt?: string | null;
  };
  csv?: {
    fileName?: string;
  };
  target?: {
    chatwootAccountId?: string | null;
    chatwootInboxId?: number | null;
  };
  dependencies?: ChatwootInboxDependency[];
  executor?: ChatwootInboxExecutor;
};

export type ChatwootHistoryJobReference = {
  id: string;
  scopeType: ChatwootHistoryScopeType;
  mode: ChatwootHistoryJobMode;
  jobStatus: ChatwootHistoryJobStatus;
  summary?: ChatwootHistoryJobSummary | null;
  report?: ChatwootHistoryJobReport | null;
  filters?: ChatwootHistoryJobFilters | null;
  errorMessage?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ChatwootHistoryJobContact = {
  id: string;
  jobId: string;
  instanceId: string;
  remoteJid: string;
  canonicalJid?: string | null;
  phoneJid?: string | null;
  lidJid?: string | null;
  canonicalIdentityType: ChatwootCanonicalIdentityType;
  identityResolutionStatus: ChatwootIdentityResolutionStatus;
  pushName?: string | null;
  classification: ChatwootHistoryClassification;
  suggestedAction: ChatwootHistorySuggestedAction;
  selectedAction?: ChatwootHistorySuggestedAction | null;
  executionStatus: ChatwootHistoryExecutionStatus;
  hasLidAlias: boolean;
  isSafeDirectImport: boolean;
  unsafeReasons: ChatwootUnsafeReason[];
  evolutionMessageCount: number;
  chatwootMessageCount: number;
  overlapCount: number;
  chatwootContactId?: number | null;
  existingConversationId?: number | null;
  selectedConversationId?: number | null;
  candidateConversationIds: number[];
  rebuiltConversationId?: number | null;
  report?: ChatwootHistoryContactReport | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  Job?: ChatwootHistoryJobReference;
};

export type ChatwootHistoryJob = ChatwootHistoryJobReference & {
  Contacts?: ChatwootHistoryJobContact[];
};

export type ChatwootInboxValidation = {
  code: string;
  label: string;
  ok: boolean;
  details?: string;
};

export type ChatwootInboxDependency = {
  code: string;
  level: "info" | "warning";
  message: string;
};

export type ChatwootInboxExecutor = {
  kind: string;
  manualFirst: boolean;
  officialChatwootExecutor: boolean;
  writesDirectlyToChatwootDatabase: boolean;
};

export type ChatwootInboxStatus = {
  enabled: boolean;
  accountId?: string | null;
  nameInbox?: string | null;
  webhookUrl?: string | null;
  inboxId?: number | null;
  inboxName?: string | null;
  inboxStatus: "resolved" | "not_found" | "invalid";
  inboxUrl?: string | null;
  isReady: boolean;
  validations: ChatwootInboxValidation[];
  dependencies: ChatwootInboxDependency[];
  executor: ChatwootInboxExecutor;
};

export type ChatwootHistoryAnalyzePayload = {
  scopeType: ChatwootHistoryScopeType;
  remoteJids?: string[];
};

export type ChatwootHistoryExecutePayload = {
  jobId: string;
  mode: "importDirect" | "rebuild";
  selectionMode: "allSafe" | "selected";
  remoteJids?: string[];
  conversationSelections?: {
    remoteJid: string;
    canonicalConversationId?: number;
  }[];
};

export type ChatwootHistoryContactActionPayload = {
  jobId: string;
  remoteJid: string;
  action: "importDirect" | "createRebuild" | "ignore" | "openChatwootReview";
  canonicalConversationId?: number;
};

export type ChatwootHistoryReprocessPayload = {
  jobId: string;
  remoteJid?: string;
};

export type ChatwootHistoryOpenReviewResponse = ChatwootReviewPayload & {
  jobId: string;
  remoteJid: string;
  action: "openChatwootReview";
  url: string | null;
};

export type ChatwootHistoryContactActionResponse = ChatwootHistoryJob | ChatwootHistoryOpenReviewResponse;
