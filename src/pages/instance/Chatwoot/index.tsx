/* eslint-disable @typescript-eslint/no-explicit-any */
import "./style.css";

import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { AlertTriangle, ArrowUpRight, CheckCircle2, Download, RefreshCw, Search, ShieldAlert, Upload, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormInput, FormSwitch, FormTags } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useInstance } from "@/contexts/InstanceContext";

import { useFindChats } from "@/lib/queries/chat/findChats";
import {
  useFetchChatwoot,
  useFetchChatwootHistoryConflicts,
  useFetchChatwootHistoryJob,
  useFetchChatwootHistoryJobs,
  useFetchChatwootInboxStatus,
} from "@/lib/queries/chatwoot/fetchChatwoot";
import { exportChatwootHistoryCsv, useManageChatwoot } from "@/lib/queries/chatwoot/manageChatwoot";
import {
  ChatwootHistoryCandidateConversation,
  ChatwootHistoryContactActionResponse,
  ChatwootHistoryExecutionStatus,
  ChatwootHistoryJob,
  ChatwootHistoryJobContact,
  ChatwootHistoryJobStatus,
  ChatwootHistoryScopeType,
  ChatwootReviewPayload,
  ChatwootUnsafeReason,
} from "@/lib/queries/chatwoot/types";
import { cn } from "@/lib/utils";

import { Chat as ChatType } from "@/types/evolution.types";

const stringOrUndefined = z
  .string()
  .optional()
  .transform((value) => (value === "" ? undefined : value));

const formSchema = z.object({
  enabled: z.boolean(),
  accountId: z.string(),
  token: z.string(),
  url: z.string(),
  signMsg: z.boolean().optional(),
  signDelimiter: stringOrUndefined,
  nameInbox: stringOrUndefined,
  organization: stringOrUndefined,
  logo: stringOrUndefined,
  reopenConversation: z.boolean().optional(),
  conversationPending: z.boolean().optional(),
  mergeBrazilContacts: z.boolean().optional(),
  importContacts: z.boolean().optional(),
  importMessages: z.boolean().optional(),
  daysLimitImportMessages: z.coerce.number().optional(),
  autoCreate: z.boolean(),
  ignoreJids: z.array(z.string()).default([]),
});

type FormSchema = z.infer<typeof formSchema>;
type HistoryTabValue = "connection" | "inbox-mapping" | "history-import" | "sync-jobs" | "conflict-review";
type ContactAction = "importDirect" | "createRebuild" | "ignore" | "openChatwootReview" | "resolveLid";

const TAB_VALUES: HistoryTabValue[] = ["connection", "inbox-mapping", "history-import", "sync-jobs", "conflict-review"];

const classificationLabels = {
  eligible: "Elegivel",
  needs_review: "Conflito",
  lid_alias: "Alias @lid",
  requires_rebuild: "Precisa rebuild",
  ignored: "Ignorado",
} as const;

const suggestedActionLabels = {
  import_direct: "Importar direto",
  create_rebuild: "Rebuild + merge",
  open_chatwoot: "Abrir no Chatwoot",
  ignore: "Ignorar",
} as const;

const executionLabels: Record<ChatwootHistoryExecutionStatus, string> = {
  pending: "Pendente",
  completed: "Concluido",
  failed: "Falhou",
  skipped: "Ignorado",
};

const jobStatusLabels: Record<ChatwootHistoryJobStatus, string> = {
  pending: "Pendente",
  analyzing: "Analisando",
  awaiting_execution: "Aguardando execucao",
  running: "Executando",
  completed: "Concluido",
  failed: "Falhou",
  partial: "Parcial",
} as const;

const jobModeLabels = {
  dryRun: "Dry run",
  importDirect: "Importacao direta",
  rebuild: "Rebuild + merge",
} as const;

const scopeLabels: Record<ChatwootHistoryScopeType, string> = {
  single: "Contato unico",
  selected: "Selecionados",
  eligibleAll: "Todos elegiveis",
};

const scopeDescriptions: Record<ChatwootHistoryScopeType, string> = {
  single: "Analisa um contato especifico.",
  selected: "Analisa uma lista escolhida manualmente.",
  eligibleAll: "Analisa todos os contatos conhecidos da instancia.",
};

const getRequestedTab = (value: string | null): HistoryTabValue | null => {
  if (!value) {
    return null;
  }

  return TAB_VALUES.includes(value as HistoryTabValue) ? (value as HistoryTabValue) : null;
};

const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString("pt-BR") : "--");
const getDisplayName = (item: Pick<ChatType, "pushName" | "remoteJid"> | Pick<ChatwootHistoryJobContact, "pushName" | "remoteJid">) => item.pushName || item.remoteJid.split("@")[0];
const getReviewPayload = (contact: ChatwootHistoryJobContact): ChatwootReviewPayload | null => contact.report?.review || null;
const getConsolidation = (contact: ChatwootHistoryJobContact) => contact.report?.consolidation || null;
const getConversationUrl = (contact: ChatwootHistoryJobContact) =>
  getReviewPayload(contact)?.chatwootReviewUrl || contact.report?.rebuiltConversationUrl || contact.report?.chatwootConversationUrl || null;
const isOpenReviewResponse = (response: ChatwootHistoryContactActionResponse): response is Extract<ChatwootHistoryContactActionResponse, { action: "openChatwootReview" }> =>
  "action" in response && response.action === "openChatwootReview";
const getUnsafeReasonLabel = (reason: ChatwootUnsafeReason) =>
  ({
    existing_conversation_overlap: "Overlap com conversa existente",
    lid_alias_detected: "Alias @lid detectado",
    multiple_candidate_conversations: "Multiplas conversas candidatas",
    source_id_collision_risk: "Risco de colisao de source_id",
    chatwoot_history_already_present: "Historico ja presente no Chatwoot",
    identity_conflict: "Identidade canonica ambigua",
  })[reason];

const getConversationSelection = (contact: ChatwootHistoryJobContact) => contact.report?.conversationSelection || null;

const getCandidateConversations = (contact: ChatwootHistoryJobContact): ChatwootHistoryCandidateConversation[] =>
  getConversationSelection(contact)?.candidateConversations || [];

const getRelatedInboxIds = (contact: ChatwootHistoryJobContact): number[] =>
  getConversationSelection(contact)?.relatedInboxIds || contact.report?.evidence?.relatedInboxIds || [];

const getDefaultCanonicalConversationId = (contact: ChatwootHistoryJobContact) =>
  getConversationSelection(contact)?.selectedConversationInternalId || contact.selectedConversationId || null;

const getCandidateConversationByInternalId = (contact: ChatwootHistoryJobContact, internalId?: number | null) =>
  getCandidateConversations(contact).find((candidate) => candidate.internalId === internalId) || null;

const getConversationStatusLabel = (status: ChatwootHistoryCandidateConversation["status"]) =>
  ({
    open: "Aberta",
    resolved: "Resolvida",
    pending: "Pendente",
    snoozed: "Adiada",
    unknown: "Desconhecida",
  })[status];

const getConversationStatusVariant = (status: ChatwootHistoryCandidateConversation["status"]) => {
  if (status === "open") return "secondary";
  if (status === "resolved") return "outline";
  if (status === "pending" || status === "snoozed") return "warning";
  return "outline";
};

const buildConflictSummary = (contact: ChatwootHistoryJobContact) => {
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

const getJobFailureReasons = (job?: ChatwootHistoryJob | null) =>
  (job?.Contacts || [])
    .filter((contact) => contact.executionStatus === "failed")
    .map((contact) => ({
      key: `${contact.jobId}:${contact.remoteJid}`,
      displayName: getDisplayName(contact),
      remoteJid: contact.remoteJid,
      error: contact.report?.execution?.error || "Falha sem detalhe adicional.",
    }));

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const statusBadgeVariant = (status: string) => {
  if (status === "completed") return "secondary";
  if (status === "failed") return "destructive";
  if (status === "running" || status === "analyzing" || status === "partial") return "warning";
  if (status === "awaiting_execution") return "outline";
  return "outline";
};

const classificationBadgeVariant = (classification: ChatwootHistoryJobContact["classification"]) => {
  if (classification === "eligible") return "secondary";
  if (classification === "ignored") return "outline";
  if (classification === "needs_review" || classification === "requires_rebuild") return "warning";
  return "destructive";
};

function Chatwoot() {
  const { t } = useTranslation();
  const { instance } = useInstance();
  const [searchParams] = useSearchParams();
  const requestedTab = getRequestedTab(searchParams.get("tab"));
  const focusedRemoteJid = searchParams.get("remoteJid");
  const [activeTab, setActiveTab] = useState<HistoryTabValue>(requestedTab || "connection");
  const [savingConnection, setSavingConnection] = useState(false);
  const [scopeType, setScopeType] = useState<ChatwootHistoryScopeType>(focusedRemoteJid ? "single" : "eligibleAll");
  const [selectionSearch, setSelectionSearch] = useState("");
  const [selectedRemoteJids, setSelectedRemoteJids] = useState<string[]>(focusedRemoteJid ? [focusedRemoteJid] : []);
  const [selectedPreviewRemoteJids, setSelectedPreviewRemoteJids] = useState<string[]>(focusedRemoteJid ? [focusedRemoteJid] : []);
  const [selectedCanonicalConversationIds, setSelectedCanonicalConversationIds] = useState<Record<string, number>>({});
  const [mergeDialogContact, setMergeDialogContact] = useState<ChatwootHistoryJobContact | null>(null);
  const [isJobDetailsDialogOpen, setIsJobDetailsDialogOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobStatusFilter, setJobStatusFilter] = useState("all");
  const [jobModeFilter, setJobModeFilter] = useState("all");

  const { createChatwoot, analyzeChatwootHistory, executeChatwootHistory, reprocessChatwootHistory, contactActionChatwootHistory } = useManageChatwoot();
  const instanceName = instance?.name || null;
  const instanceToken = instance?.token;
  const { data: chatwoot } = useFetchChatwoot({ instanceName, token: instanceToken });
  const { data: inboxStatus, refetch: refetchInboxStatus, isFetching: inboxStatusLoading } = useFetchChatwootInboxStatus({ instanceName, token: instanceToken });
  const { data: chats = [] } = useFindChats({ instanceName: instance?.name });
  const { data: historyJobs = [], refetch: refetchHistoryJobs, isFetching: jobsLoading } = useFetchChatwootHistoryJobs({ instanceName, token: instanceToken });
  const { data: selectedJob, refetch: refetchSelectedJob, isFetching: selectedJobLoading } = useFetchChatwootHistoryJob({
    instanceName,
    token: instanceToken,
    jobId: selectedJobId,
  });
  const { data: conflicts = [], refetch: refetchConflicts, isFetching: conflictsLoading } = useFetchChatwootHistoryConflicts({
    instanceName,
    token: instanceToken,
  });

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      enabled: true,
      accountId: "",
      token: "",
      url: "",
      signMsg: true,
      signDelimiter: "\\n",
      nameInbox: "",
      organization: "",
      logo: "",
      reopenConversation: true,
      conversationPending: false,
      mergeBrazilContacts: true,
      importContacts: false,
      importMessages: false,
      daysLimitImportMessages: 7,
      autoCreate: true,
      ignoreJids: [],
    },
  });

  const selectableChats = chats.filter((chat) => chat.remoteJid?.endsWith("@s.whatsapp.net"));
  const filteredSelectableChats = selectableChats.filter((chat) => {
    const term = selectionSearch.trim().toLowerCase();
    if (!term) {
      return true;
    }

    return getDisplayName(chat).toLowerCase().includes(term) || chat.remoteJid.toLowerCase().includes(term);
  });
  const filteredJobs = historyJobs.filter((job) => {
    if (jobStatusFilter !== "all" && job.jobStatus !== jobStatusFilter) {
      return false;
    }

    if (jobModeFilter !== "all" && job.mode !== jobModeFilter) {
      return false;
    }

    return true;
  });
  const visibleContacts = (selectedJob?.Contacts || []).filter((contact) => !focusedRemoteJid || contact.remoteJid === focusedRemoteJid);
  const visibleConflicts = conflicts.filter((contact) => !focusedRemoteJid || contact.remoteJid === focusedRemoteJid);
  const filteredSelectableRemoteJids = filteredSelectableChats.map((chat) => chat.remoteJid);
  const visibleContactRemoteJids = visibleContacts.map((contact) => contact.remoteJid);
  const selectedJobFailureReasons = getJobFailureReasons(selectedJob);
  const isSelectedJobHydrated = Boolean(selectedJob && selectedJob.id === selectedJobId);
  const selectedJobDetails = isSelectedJobHydrated ? selectedJob : null;
  const areAllScopeContactsSelected =
    scopeType !== "single" && filteredSelectableRemoteJids.length > 0 && filteredSelectableRemoteJids.every((remoteJid) => selectedRemoteJids.includes(remoteJid));
  const areAllPreviewContactsSelected =
    visibleContactRemoteJids.length > 0 && visibleContactRemoteJids.every((remoteJid) => selectedPreviewRemoteJids.includes(remoteJid));
  const getContactSelectionKey = (contact: Pick<ChatwootHistoryJobContact, "jobId" | "remoteJid">) => `${contact.jobId}:${contact.remoteJid}`;
  const getSelectedCanonicalConversationId = (contact: ChatwootHistoryJobContact) =>
    selectedCanonicalConversationIds[getContactSelectionKey(contact)] ?? getDefaultCanonicalConversationId(contact);

  useEffect(() => {
    if (requestedTab) {
      setActiveTab(requestedTab);
    }
  }, [requestedTab]);

  useEffect(() => {
    if (focusedRemoteJid) {
      setScopeType("single");
      setSelectedRemoteJids([focusedRemoteJid]);
      setSelectedPreviewRemoteJids([focusedRemoteJid]);
      if (!requestedTab) {
        setActiveTab("history-import");
      }
    }
  }, [focusedRemoteJid, requestedTab]);

  useEffect(() => {
    if (!selectedJobId && historyJobs[0]?.id) {
      setSelectedJobId(historyJobs[0].id);
    }
  }, [historyJobs, selectedJobId]);

  useEffect(() => {
    if (chatwoot) {
      form.reset({
        enabled: chatwoot.enabled,
        accountId: chatwoot.accountId,
        token: chatwoot.token,
        url: chatwoot.url,
        signMsg: chatwoot.signMsg || false,
        signDelimiter: chatwoot.signDelimiter || "\\n",
        nameInbox: chatwoot.nameInbox || "",
        organization: chatwoot.organization || "",
        logo: chatwoot.logo || "",
        reopenConversation: chatwoot.reopenConversation || false,
        conversationPending: chatwoot.conversationPending || false,
        mergeBrazilContacts: chatwoot.mergeBrazilContacts || false,
        importContacts: chatwoot.importContacts || false,
        importMessages: chatwoot.importMessages || false,
        daysLimitImportMessages: chatwoot.daysLimitImportMessages || 7,
        autoCreate: chatwoot.autoCreate || false,
        ignoreJids: chatwoot.ignoreJids || [],
      });
    }
  }, [chatwoot, form]);

  useEffect(() => {
    const contacts = selectedJob?.Contacts || [];
    if (contacts.length === 0) {
      return;
    }

    setSelectedCanonicalConversationIds((current) => {
      const next = { ...current };

      contacts.forEach((contact) => {
        const defaultCanonicalConversationId = getDefaultCanonicalConversationId(contact);
        if (!defaultCanonicalConversationId) {
          return;
        }

        const key = getContactSelectionKey(contact);
        if (!next[key]) {
          next[key] = defaultCanonicalConversationId;
        }
      });

      return next;
    });
  }, [selectedJob]);

  const showRequestError = (error: unknown, fallback: string) => {
    if (isAxiosError(error)) {
      toast.error(`Erro: ${error?.response?.data?.response?.message || error.message}`);
      return;
    }

    toast.error(fallback);
  };

  const openExternal = (url?: string | null) => {
    if (!url) {
      toast.info("Nenhum link do Chatwoot foi resolvido.");
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const toggleScopeSelection = (remoteJid: string) => {
    if (scopeType === "single") {
      setSelectedRemoteJids([remoteJid]);
      return;
    }

    setSelectedRemoteJids((current) => (current.includes(remoteJid) ? current.filter((item) => item !== remoteJid) : [...current, remoteJid]));
  };

  const togglePreviewSelection = (remoteJid: string) => {
    setSelectedPreviewRemoteJids((current) => (current.includes(remoteJid) ? current.filter((item) => item !== remoteJid) : [...current, remoteJid]));
  };

  const setCanonicalConversation = (contact: ChatwootHistoryJobContact, internalId?: number | null) => {
    const key = getContactSelectionKey(contact);

    setSelectedCanonicalConversationIds((current) => {
      const next = { ...current };

      if (!internalId) {
        delete next[key];
        return next;
      }

      next[key] = internalId;
      return next;
    });
  };

  const openMergeDialog = (contact: ChatwootHistoryJobContact) => {
    setMergeDialogContact(contact);
  };

  const openJobDetails = (jobId: string) => {
    setActiveTab("sync-jobs");
    setSelectedJobId(jobId);
    setIsJobDetailsDialogOpen(true);
  };

  const closeMergeDialog = () => {
    setMergeDialogContact(null);
  };

  const handleSelectAllScopeContacts = () => {
    if (scopeType === "single") {
      return;
    }

    setSelectedRemoteJids((current) => {
      const everyVisibleSelected = filteredSelectableRemoteJids.every((remoteJid) => current.includes(remoteJid));
      if (everyVisibleSelected) {
        return current.filter((remoteJid) => !filteredSelectableRemoteJids.includes(remoteJid));
      }

      return [...new Set([...current, ...filteredSelectableRemoteJids])];
    });
  };

  const handleSelectAllPreviewContacts = () => {
    setSelectedPreviewRemoteJids((current) => {
      const everyVisibleSelected = visibleContactRemoteJids.every((remoteJid) => current.includes(remoteJid));
      if (everyVisibleSelected) {
        return current.filter((remoteJid) => !visibleContactRemoteJids.includes(remoteJid));
      }

      return [...new Set([...current, ...visibleContactRemoteJids])];
    });
  };

  const handleSaveConnection = async (data: FormSchema) => {
    if (!instance) return;

    setSavingConnection(true);

    await createChatwoot(
      {
        instanceName: instance.name,
        token: instance.token,
        data: {
          enabled: data.enabled,
          accountId: data.accountId,
          token: data.token,
          url: data.url,
          signMsg: data.signMsg || false,
          signDelimiter: data.signDelimiter || "\\n",
          nameInbox: data.nameInbox || "",
          organization: data.organization || "",
          logo: data.logo || "",
          reopenConversation: data.reopenConversation || false,
          conversationPending: data.conversationPending || false,
          mergeBrazilContacts: data.mergeBrazilContacts || false,
          importContacts: data.importContacts || false,
          importMessages: data.importMessages || false,
          daysLimitImportMessages: data.daysLimitImportMessages || 7,
          autoCreate: data.autoCreate,
          ignoreJids: data.ignoreJids,
        },
      },
      {
        onSuccess: async () => {
          toast.success(t("chatwoot.toast.success"));
          await refetchInboxStatus();
        },
        onError: (error) => showRequestError(error, t("chatwoot.toast.error")),
        onSettled: () => setSavingConnection(false),
      },
    );
  };

  const handleAnalyze = async () => {
    if (!instance) return;

    const remoteJids = scopeType === "eligibleAll" ? undefined : scopeType === "single" ? selectedRemoteJids.slice(0, 1) : selectedRemoteJids;
    if (scopeType === "single" && remoteJids?.length !== 1) {
      toast.warning("Selecione um contato para o dry run.");
      return;
    }
    if (scopeType === "selected" && !remoteJids?.length) {
      toast.warning("Selecione ao menos um contato para o dry run.");
      return;
    }

    try {
      toast.info("Executando dry run...");
      const job = await analyzeChatwootHistory({
        instanceName: instance.name,
        token: instance.token,
        data: {
          scopeType,
          remoteJids,
        },
      });

      setSelectedJobId(job.id);
      setSelectedPreviewRemoteJids(focusedRemoteJid ? [focusedRemoteJid] : []);
      toast.success("Dry run concluido.");
    } catch (error) {
      showRequestError(error, "Nao foi possivel executar o dry run.");
    }
  };

  const handleExecute = async (mode: "importDirect" | "rebuild", selectionMode: "allSafe" | "selected") => {
    if (!instance || !selectedJobId) return;
    if (selectionMode === "selected" && selectedPreviewRemoteJids.length === 0) {
      toast.warning("Selecione ao menos um contato da previa.");
      return;
    }

    const conversationSelections =
      mode === "rebuild"
        ? visibleContacts
            .filter((contact) => (selectionMode === "selected" ? selectedPreviewRemoteJids.includes(contact.remoteJid) : true))
            .map((contact) => {
              const canonicalConversationId = getSelectedCanonicalConversationId(contact);
              return canonicalConversationId
                ? {
                    remoteJid: contact.remoteJid,
                    canonicalConversationId,
                  }
                : null;
            })
            .filter((value): value is { remoteJid: string; canonicalConversationId: number } => Boolean(value))
        : undefined;

    try {
      toast.info(mode === "rebuild" ? "Executando rebuild..." : "Executando importação...");
      const job = await executeChatwootHistory({
        instanceName: instance.name,
        token: instance.token,
        data: {
          jobId: selectedJobId,
          mode,
          selectionMode,
          remoteJids: selectionMode === "selected" ? selectedPreviewRemoteJids : undefined,
          conversationSelections,
        },
      });

      setSelectedJobId(job.id);
      setActiveTab("sync-jobs");
      toast.success(mode === "rebuild" ? "Rebuild executado." : "Importacao executada.");
    } catch (error) {
      showRequestError(error, "Nao foi possivel executar o job.");
    }
  };

  const handleReprocess = async (jobId: string, remoteJid?: string) => {
    if (!instance) return;

    try {
      const job = await reprocessChatwootHistory({
        instanceName: instance.name,
        token: instance.token,
        data: { jobId, remoteJid },
      });

      setSelectedJobId(job.id);
      toast.success(remoteJid ? "Contato reprocessado." : "Job reprocessado.");
    } catch (error) {
      showRequestError(error, "Nao foi possivel reprocessar.");
    }
  };

  const handleDownloadCsv = async (jobId: string) => {
    if (!instance) return;

    try {
      const blob = await exportChatwootHistoryCsv({
        instanceName: instance.name,
        token: instance.token,
        jobId,
      });
      downloadBlob(blob, `chatwoot-history-${jobId}.csv`);
    } catch (error) {
      showRequestError(error, "Nao foi possivel baixar o CSV.");
    }
  };

  const executeContactAction = async (
    contact: ChatwootHistoryJobContact,
    action: Exclude<ContactAction, "openChatwootReview">,
    canonicalConversationId?: number,
  ) => {
    if (!instance) return;

    try {
      toast.info("Executando ação...");
      const response = await contactActionChatwootHistory({
        instanceName: instance.name,
        token: instance.token,
        data: {
          jobId: contact.jobId,
          remoteJid: contact.remoteJid,
          action,
          canonicalConversationId,
        },
      });

      if (isOpenReviewResponse(response)) {
        openExternal(response.chatwootReviewUrl || response.chatwootFallbackUrl || response.url || inboxStatus?.inboxUrl || chatwoot?.url);
        return;
      }

      setSelectedJobId(response.id);
      await Promise.all([refetchSelectedJob(), refetchHistoryJobs()]);
      toast.success(action === "ignore" ? "Contato ignorado." : action === "createRebuild" ? "Rebuild iniciado." : "Importação executada.");
      return true;
    } catch (error) {
      showRequestError(error, "Nao foi possivel executar a acao.");
      return false;
    }
  };

  const handleContactAction = async (contact: ChatwootHistoryJobContact, action: ContactAction) => {
    if (action === "openChatwootReview") {
      const reviewPayload = getReviewPayload(contact);
      openExternal(reviewPayload?.chatwootReviewUrl || reviewPayload?.chatwootFallbackUrl || getConversationUrl(contact) || inboxStatus?.inboxUrl || chatwoot?.webhook_url || chatwoot?.url);
      return;
    }

    if (action === "resolveLid") {
      try {
        toast.info("Resolvendo LID...");
        const response = await contactActionChatwootHistory({
          instanceName: instance!.name,
          token: instance!.token,
          data: { jobId: contact.jobId, remoteJid: contact.remoteJid, action: "resolveLid" },
        });
        if (!isOpenReviewResponse(response)) {
          setSelectedJobId(response.id);
          await Promise.all([refetchSelectedJob(), refetchHistoryJobs()]);
        }
        toast.success("LID resolvido.");
      } catch (error) {
        showRequestError(error, "Nao foi possivel resolver o LID.");
      }
      return;
    }

    await executeContactAction(contact, action, action === "createRebuild" ? getSelectedCanonicalConversationId(contact) : undefined);
  };

  const handleConfirmMerge = async () => {
    if (!mergeDialogContact) return;

    const ok = await executeContactAction(mergeDialogContact, "createRebuild", getSelectedCanonicalConversationId(mergeDialogContact));
    if (ok) {
      closeMergeDialog();
    }
  };

  const renderContactsTable = (contacts: ChatwootHistoryJobContact[], options?: { selectable?: boolean; showJob?: boolean }) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {options?.selectable ? <TableHead className="w-12">Sel.</TableHead> : null}
            <TableHead>Contato</TableHead>
            <TableHead>Diagnostico</TableHead>
            <TableHead>Metricas</TableHead>
            <TableHead>Conversas</TableHead>
            {options?.showJob ? <TableHead>Job</TableHead> : null}
            <TableHead>Status</TableHead>
            <TableHead className="min-w-[280px]">Acoes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={options?.showJob ? (options?.selectable ? 8 : 7) : options?.selectable ? 7 : 6} className="h-24 text-center text-muted-foreground">
                Nada para mostrar.
              </TableCell>
            </TableRow>
          ) : null}
          {contacts.map((contact) => {
            const isSelected = selectedPreviewRemoteJids.includes(contact.remoteJid);
            const reviewPayload = getReviewPayload(contact);
            const consolidation = getConsolidation(contact);
            const candidateConversations = getCandidateConversations(contact);
            const selectedCanonicalConversationId = getSelectedCanonicalConversationId(contact);
            const selectedCanonicalConversation = getCandidateConversationByInternalId(contact, selectedCanonicalConversationId);

            return (
              <TableRow key={`${contact.jobId}:${contact.remoteJid}`}>
                {options?.selectable ? (
                  <TableCell>
                    <input checked={isSelected} className="h-4 w-4 accent-primary" type="checkbox" onChange={() => togglePreviewSelection(contact.remoteJid)} />
                  </TableCell>
                ) : null}
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{getDisplayName(contact)}</span>
                    <span className="text-xs text-muted-foreground">{contact.remoteJid}</span>
                    <span className="text-xs text-muted-foreground">phoneJid: {contact.phoneJid || "--"}</span>
                    <span className="text-xs text-muted-foreground">lidJid: {contact.lidJid || "--"}</span>
                    <span className="text-xs text-muted-foreground">
                      Identidade: {contact.canonicalIdentityType} / {contact.identityResolutionStatus}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-2">
                    <Badge variant={classificationBadgeVariant(contact.classification)}>{classificationLabels[contact.classification]}</Badge>
                    <span className="text-sm">{suggestedActionLabels[contact.suggestedAction]}</span>
                    <Badge variant={contact.isSafeDirectImport ? "secondary" : "outline"}>
                      {contact.isSafeDirectImport ? "Direct import seguro" : "Direct import inseguro"}
                    </Badge>
                    {contact.unsafeReasons.length > 0 ? (
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        {contact.unsafeReasons.map((reason) => (
                          <span key={reason}>{getUnsafeReasonLabel(reason)}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  <div>Evolution: {contact.evolutionMessageCount}</div>
                  <div>Chatwoot: {contact.chatwootMessageCount}</div>
                  <div>Overlap: {contact.overlapCount}</div>
                  <div>Safe direct: {contact.isSafeDirectImport ? "sim" : "nao"}</div>
                </TableCell>
                <TableCell className="text-sm">
                  <div>Canonica: {selectedCanonicalConversation ? `#${selectedCanonicalConversation.displayId}` : "--"}</div>
                  <div>Inbox alvo: {reviewPayload?.chatwootInboxId || "--"}</div>
                  <div>Inboxes relacionadas: {getRelatedInboxIds(contact).length ? getRelatedInboxIds(contact).join(", ") : "--"}</div>
                  <div>
                    Candidatas:{" "}
                    {candidateConversations.length
                      ? candidateConversations.map((item) => `#${item.displayId}`).join(", ")
                      : contact.candidateConversationIds.length
                        ? `${contact.candidateConversationIds.length} interna(s)`
                        : "--"}
                  </div>
                  <div>Rebuild: {contact.rebuiltConversationId ? `interna #${contact.rebuiltConversationId}` : "--"}</div>
                  <div>Supersedidas: {consolidation?.supersededConversationIds?.length ? consolidation.supersededConversationIds.map((item) => `#${item}`).join(", ") : "--"}</div>
                  <div>Migradas: {consolidation?.movedChatwootMessageCount ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Contato CW: {contact.chatwootContactId || "--"}</div>
                  <div className="text-xs text-muted-foreground">Review URL: {reviewPayload?.chatwootReviewUrl || "--"}</div>
                  {contact.report?.execution?.warning ? <div className="text-xs text-amber-600">{contact.report.execution.warning}</div> : null}
                  {contact.report?.execution?.error ? <div className="text-xs text-destructive">{contact.report.execution.error}</div> : null}
                  {candidateConversations.length > 0 ? (
                    <div className="mt-3 space-y-2 rounded-md border p-2">
                      <div className="text-xs font-medium text-muted-foreground">Resumo do conflito</div>
                      <div className="text-xs text-muted-foreground">{buildConflictSummary(contact) || "Clique em Rebuild + merge para escolher a conversa canonica."}</div>
                      {candidateConversations.map((candidate) => {
                        const isCanonical = selectedCanonicalConversationId === candidate.internalId;

                        return (
                          <div
                            key={`${contact.jobId}:${contact.remoteJid}:candidate:${candidate.internalId}`}
                            className={cn("rounded-md border p-2 transition-colors", isCanonical ? "border-primary bg-primary/5" : "bg-background")}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => setCanonicalConversation(contact, candidate.internalId)}
                                className="flex items-center gap-2 text-left">
                                <input checked={isCanonical} readOnly className="h-4 w-4 accent-primary" type="radio" />
                                <span className="font-medium">#{candidate.displayId}</span>
                              </button>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={getConversationStatusVariant(candidate.status)}>{getConversationStatusLabel(candidate.status)}</Badge>
                                {candidate.attachmentMessageCount > 0 ? <Badge variant="secondary">Midia {candidate.attachmentMessageCount}</Badge> : null}
                                {candidate.overlapCount > 0 ? <Badge variant="outline">Overlap {candidate.overlapCount}</Badge> : null}
                                {candidate.reviewUrl ? (
                                  <Button type="button" size="sm" variant="ghost" onClick={() => openExternal(candidate.reviewUrl)}>
                                    Abrir
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                            <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                              <div>Inbox: {candidate.inboxId || "--"}</div>
                              <div>Interna: {candidate.internalId}</div>
                              <div>Mensagens: {candidate.messageCount}</div>
                              <div>Primeira: {formatDateTime(candidate.firstMessageAt)}</div>
                              <div>Ultima: {formatDateTime(candidate.lastMessageAt || candidate.lastActivityAt)}</div>
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => setCanonicalConversation(contact, null)}>
                          Criar nova canonica
                        </Button>
                        {selectedCanonicalConversation ? (
                          <span className="text-xs text-muted-foreground">A canonica #{selectedCanonicalConversation.displayId} vai preservar a midia e receber so os extras.</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem escolha explicita, o merge pode criar uma nova conversa canonica.</span>
                        )}
                      </div>
                    </div>
                  ) : null}
                </TableCell>
                {options?.showJob ? (
                  <TableCell className="text-sm">
                    <div>{contact.Job ? jobModeLabels[contact.Job.mode] : "--"}</div>
                    <div className="text-xs text-muted-foreground">{contact.jobId}</div>
                  </TableCell>
                ) : null}
                <TableCell>
                  <div className="space-y-1">
                    <Badge variant={statusBadgeVariant(contact.executionStatus)}>{executionLabels[contact.executionStatus]}</Badge>
                    {contact.executionStatus === "failed" && contact.report?.execution?.error ? (
                      <div className="max-w-xs text-xs text-destructive">{contact.report.execution.error}</div>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={contact.isSafeDirectImport ? "outline" : "destructive"}
                      onClick={() => {
                        if (!contact.isSafeDirectImport) {
                          if (!window.confirm(`Este contato tem riscos: ${contact.unsafeReasons.map(getUnsafeReasonLabel).join(", ")}. Deseja forçar a importação?`)) {
                            return;
                          }
                        }
                        handleContactAction(contact, "importDirect");
                      }}
                    >
                      Importar
                    </Button>
                    <Button size="sm" variant="secondary" disabled={contact.classification === "ignored"} onClick={() => openMergeDialog(contact)}>
                      Rebuild + merge
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleContactAction(contact, "ignore")}>
                      Ignorar
                    </Button>
                    {contact.hasLidAlias && !contact.phoneJid && (
                      <Button size="sm" variant="outline" onClick={() => handleContactAction(contact, "resolveLid")}>
                        <Search className="mr-1 h-3 w-3" />
                        Resolver LID
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => handleContactAction(contact, "openChatwootReview")}>
                      Chatwoot
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  const mergeDialogCandidateConversations = mergeDialogContact ? getCandidateConversations(mergeDialogContact) : [];
  const mergeDialogReviewPayload = mergeDialogContact ? getReviewPayload(mergeDialogContact) : null;
  const mergeDialogRelatedInboxIds = mergeDialogContact ? getRelatedInboxIds(mergeDialogContact) : [];
  const mergeDialogSelectedCanonicalConversationId = mergeDialogContact ? getSelectedCanonicalConversationId(mergeDialogContact) : null;
  const mergeDialogSelectedCanonicalConversation = mergeDialogContact
    ? getCandidateConversationByInternalId(mergeDialogContact, mergeDialogSelectedCanonicalConversationId)
    : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl">Chatwoot Sync</CardTitle>
              <CardDescription>Analise, triagem, jobs e relatorios ficam no Evolution. A revisao visual final da conversa continua no Chatwoot.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Manual-first</Badge>
              <Badge variant="secondary">Dry run padrao</Badge>
              {focusedRemoteJid ? <Badge variant="warning">Foco: {focusedRemoteJid}</Badge> : null}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as HistoryTabValue)} className="space-y-4">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
          <TabsTrigger value="connection">Connection</TabsTrigger>
          <TabsTrigger value="inbox-mapping">Inbox Mapping</TabsTrigger>
          <TabsTrigger value="history-import">History Import</TabsTrigger>
          <TabsTrigger value="sync-jobs">Sync Jobs</TabsTrigger>
          <TabsTrigger value="conflict-review">Conflict Review</TabsTrigger>
        </TabsList>

        <TabsContent value="connection">
          <Card>
            <CardHeader>
              <CardTitle>{t("chatwoot.title")}</CardTitle>
              <CardDescription>Configuracao principal da integracao e do inbox usado por todos os jobs historicos.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSaveConnection)} className="space-y-6">
                  <div className="space-y-2 divide-y rounded-lg border [&>*]:px-4 [&>*]:py-3">
                    <FormSwitch name="enabled" label={t("chatwoot.form.enabled.label")} className="w-full justify-between" helper={t("chatwoot.form.enabled.description")} />
                    <FormInput name="url" label={t("chatwoot.form.url.label")}>
                      <Input />
                    </FormInput>
                    <FormInput name="accountId" label={t("chatwoot.form.accountId.label")}>
                      <Input />
                    </FormInput>
                    <FormInput name="token" label={t("chatwoot.form.token.label")}>
                      <Input type="password" />
                    </FormInput>
                    <FormSwitch name="signMsg" label={t("chatwoot.form.signMsg.label")} className="w-full justify-between" helper={t("chatwoot.form.signMsg.description")} />
                    <FormInput name="signDelimiter" label={t("chatwoot.form.signDelimiter.label")}>
                      <Input />
                    </FormInput>
                    <FormInput name="nameInbox" label={t("chatwoot.form.nameInbox.label")}>
                      <Input />
                    </FormInput>
                    <FormInput name="organization" label={t("chatwoot.form.organization.label")}>
                      <Input />
                    </FormInput>
                    <FormInput name="logo" label={t("chatwoot.form.logo.label")}>
                      <Input />
                    </FormInput>
                    <FormSwitch
                      name="conversationPending"
                      label={t("chatwoot.form.conversationPending.label")}
                      className="w-full justify-between"
                      helper={t("chatwoot.form.conversationPending.description")}
                    />
                    <FormSwitch name="reopenConversation" label={t("chatwoot.form.reopenConversation.label")} className="w-full justify-between" helper={t("chatwoot.form.reopenConversation.description")} />
                    <FormSwitch name="importContacts" label={t("chatwoot.form.importContacts.label")} className="w-full justify-between" helper={t("chatwoot.form.importContacts.description")} />
                    <FormSwitch name="importMessages" label={t("chatwoot.form.importMessages.label")} className="w-full justify-between" helper={t("chatwoot.form.importMessages.description")} />
                    <FormInput name="daysLimitImportMessages" label={t("chatwoot.form.daysLimitImportMessages.label")}>
                      <Input type="number" />
                    </FormInput>
                    <FormTags name="ignoreJids" label={t("chatwoot.form.ignoreJids.label")} placeholder={t("chatwoot.form.ignoreJids.placeholder")} />
                    <FormSwitch name="autoCreate" label={t("chatwoot.form.autoCreate.label")} className="w-full justify-between" helper={t("chatwoot.form.autoCreate.description")} />
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={savingConnection}>
                      {savingConnection ? "Salvando..." : t("chatwoot.button.save")}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inbox-mapping">
          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Resolucao do inbox</CardTitle>
                <CardDescription>Readiness operacional do inbox usado pelo pipeline historico.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">Status</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant={inboxStatus?.inboxStatus === "resolved" ? "secondary" : "destructive"}>{inboxStatus?.inboxStatus === "resolved" ? "Inbox resolvido" : "Inbox nao encontrado"}</Badge>
                      <Badge variant={inboxStatus?.enabled ? "secondary" : "outline"}>{inboxStatus?.enabled ? "Integracao ativa" : "Integracao inativa"}</Badge>
                      <Badge variant={inboxStatus?.isReady ? "secondary" : "warning"}>{inboxStatus?.isReady ? "Pronto para operar" : "Bloqueado para analise"}</Badge>
                    </div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">Webhook resolvido</div>
                    <div className="mt-2 break-all text-sm">{inboxStatus?.webhookUrl || chatwoot?.webhook_url || "--"}</div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">Account ID</div>
                    <div className="mt-2 text-sm font-medium">{inboxStatus?.accountId || "--"}</div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">Inbox</div>
                    <div className="mt-2 text-sm font-medium">{inboxStatus?.inboxName || inboxStatus?.nameInbox || "--"}</div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">Inbox ID</div>
                    <div className="mt-2 text-sm font-medium">{inboxStatus?.inboxId || "--"}</div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">Acesso rapido</div>
                    <button type="button" className="mt-2 inline-flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline" onClick={() => openExternal(inboxStatus?.inboxUrl || chatwoot?.url)}>
                      Abrir inbox no Chatwoot
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm font-medium">Validacoes de integridade</div>
                  <div className="mt-3 grid gap-2">
                    {(inboxStatus?.validations || []).map((validation) => (
                      <div key={validation.code} className="rounded-md border px-3 py-2">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span>{validation.label}</span>
                          <Badge variant={validation.ok ? "secondary" : "warning"}>{validation.ok ? "OK" : "Falhou"}</Badge>
                        </div>
                        {validation.details ? <div className="mt-1 text-xs text-muted-foreground">{validation.details}</div> : null}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm font-medium">Dependencias e executor</div>
                  <div className="mt-3 space-y-2 text-sm">
                    {(inboxStatus?.dependencies || []).map((dependency) => (
                      <div key={dependency.code} className="rounded-md border px-3 py-2">
                        <div className="font-medium">{dependency.code}</div>
                        <div className="text-muted-foreground">{dependency.message}</div>
                      </div>
                    ))}
                    {inboxStatus?.executor ? (
                      <div className="rounded-md border px-3 py-2">
                        <div className="font-medium">{inboxStatus.executor.kind}</div>
                        <div className="text-muted-foreground">
                          manualFirst: {String(inboxStatus.executor.manualFirst)} | oficial: {String(inboxStatus.executor.officialChatwootExecutor)} | escreve no DB: {String(inboxStatus.executor.writesDirectlyToChatwootDatabase)}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                <Button variant="outline" onClick={() => refetchInboxStatus()} disabled={inboxStatusLoading}>
                  <RefreshCw className={cn("mr-2 h-4 w-4", inboxStatusLoading && "animate-spin")} />
                  Atualizar status
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Defaults da v1</CardTitle>
                <CardDescription>Guardrails importantes do cockpit historico.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="rounded-lg border p-4">Sem override por execucao: os jobs sempre usam o inbox salvo na instancia.</div>
                <div className="rounded-lg border p-4">Dry run primeiro: a recomendacao e revisar elegibilidade e conflito antes de importar.</div>
                <div className="rounded-lg border p-4">Conversa canonica: a decisao visual final da timeline continua no Chatwoot.</div>
                <div className="rounded-lg border p-4">Dedupe v1: normalizacao de WAID/evo:wa, fallback por tempo + direcao + conteudo e preferencia pelo Chatwoot em colisao.</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history-import">
          <div className="grid gap-6 xl:grid-cols-[1fr_1.5fr]">
            <Card>
              <CardHeader>
                <CardTitle>Escopo e execucao</CardTitle>
                <CardDescription>Selecione o escopo, gere a previa e dispare importacao direta ou rebuild.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 md:grid-cols-3">
                  {(["single", "selected", "eligibleAll"] as ChatwootHistoryScopeType[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setScopeType(value);
                        if (value === "eligibleAll") {
                          setSelectedRemoteJids([]);
                        }
                      }}
                      className={cn("rounded-lg border px-4 py-3 text-left transition-colors", scopeType === value ? "border-primary bg-primary/5" : "hover:bg-muted/50")}>
                      <div className="font-medium">{scopeLabels[value]}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{scopeDescriptions[value]}</div>
                    </button>
                  ))}
                </div>

                {scopeType !== "eligibleAll" ? (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                      <Input value={selectionSearch} onChange={(event) => setSelectionSearch(event.target.value)} className="pl-9" placeholder="Filtrar contatos por nome ou JID" />
                    </div>
                    {scopeType !== "single" ? (
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={handleSelectAllScopeContacts} disabled={filteredSelectableRemoteJids.length === 0}>
                          {areAllScopeContactsSelected ? "Desmarcar todos" : "Selecionar todos"}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedRemoteJids([])} disabled={selectedRemoteJids.length === 0}>
                          Limpar selecao
                        </Button>
                      </div>
                    ) : null}
                    <ScrollArea className="h-72 rounded-lg border">
                      <div className="space-y-1 p-2">
                        {filteredSelectableChats.map((chat) => {
                          const isSelected = selectedRemoteJids.includes(chat.remoteJid);

                          return (
                            <button
                              key={chat.id}
                              type="button"
                              onClick={() => toggleScopeSelection(chat.remoteJid)}
                              className={cn("flex w-full items-start justify-between rounded-md px-3 py-3 text-left transition-colors", isSelected ? "bg-primary/5" : "hover:bg-muted/50")}>
                              <div>
                                <div className="font-medium">{getDisplayName(chat)}</div>
                                <div className="text-xs text-muted-foreground">{chat.remoteJid}</div>
                              </div>
                              <input checked={isSelected} readOnly className="mt-1 h-4 w-4 accent-primary" type={scopeType === "single" ? "radio" : "checkbox"} />
                            </button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={handleAnalyze}>
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    Dry run
                  </Button>
                  <Button type="button" variant="outline" disabled={!selectedJobId} onClick={() => handleExecute("importDirect", "allSafe")}>
                    <Upload className="mr-2 h-4 w-4" />
                    Importar elegiveis
                  </Button>
                  <Button type="button" variant="outline" disabled={!selectedJobId || selectedPreviewRemoteJids.length === 0} onClick={() => handleExecute("importDirect", "selected")}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Importar selecionado
                  </Button>
                  <Button type="button" variant="secondary" disabled={!selectedJobId || selectedPreviewRemoteJids.length === 0} onClick={() => handleExecute("rebuild", "selected")}>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Rebuild selecionado
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Previa do job</CardTitle>
                <CardDescription>Use esta tabela para selecionar contatos e disparar a acao correta.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedJob ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="rounded-lg border p-4">
                        <div className="text-sm text-muted-foreground">Contatos</div>
                        <div className="mt-2 text-2xl font-semibold">{selectedJob.summary?.totalContacts || 0}</div>
                      </div>
                      <div className="rounded-lg border p-4">
                        <div className="text-sm text-muted-foreground">Elegiveis</div>
                        <div className="mt-2 text-2xl font-semibold">{selectedJob.summary?.eligible || 0}</div>
                      </div>
                      <div className="rounded-lg border p-4">
                        <div className="text-sm text-muted-foreground">Conflitos</div>
                        <div className="mt-2 text-2xl font-semibold">{(selectedJob.summary?.needsReview || 0) + (selectedJob.summary?.lidAlias || 0) + (selectedJob.summary?.requiresRebuild || 0)}</div>
                      </div>
                      <div className="rounded-lg border p-4">
                        <div className="text-sm text-muted-foreground">Safe direct</div>
                        <div className="mt-2 text-2xl font-semibold">{selectedJob.summary?.safeDirectImport || 0}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={handleSelectAllPreviewContacts} disabled={visibleContactRemoteJids.length === 0}>
                        {areAllPreviewContactsSelected ? "Desmarcar todas" : "Selecionar todas"}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedPreviewRemoteJids([])} disabled={selectedPreviewRemoteJids.length === 0}>
                        Limpar selecao
                      </Button>
                    </div>
                    {renderContactsTable(visibleContacts, { selectable: true })}
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">Execute um dry run para gerar a previa.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sync-jobs">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle>Historico de jobs</CardTitle>
                    <CardDescription>Auditoria, CSV e reprocessamento por job.</CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => refetchHistoryJobs()} disabled={jobsLoading}>
                    <RefreshCw className={cn("mr-2 h-4 w-4", jobsLoading && "animate-spin")} />
                    Atualizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Select value={jobStatusFilter} onValueChange={setJobStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="analyzing">Analisando</SelectItem>
                      <SelectItem value="awaiting_execution">Aguardando execucao</SelectItem>
                      <SelectItem value="running">Executando</SelectItem>
                      <SelectItem value="completed">Concluido</SelectItem>
                      <SelectItem value="partial">Parcial</SelectItem>
                      <SelectItem value="failed">Falhou</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={jobModeFilter} onValueChange={setJobModeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Modo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os modos</SelectItem>
                      <SelectItem value="dryRun">Dry run</SelectItem>
                      <SelectItem value="importDirect">Importacao direta</SelectItem>
                      <SelectItem value="rebuild">Rebuild</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Modo</TableHead>
                        <TableHead>Contatos</TableHead>
                        <TableHead>Inicio</TableHead>
                        <TableHead className="min-w-[280px]">Acoes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredJobs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                            Nenhum job encontrado.
                          </TableCell>
                        </TableRow>
                      ) : null}
                      {filteredJobs.map((job) => (
                        <TableRow key={job.id} className={cn(selectedJobId === job.id && "bg-muted/40")}>
                          <TableCell>
                            <div className="font-medium">{job.id}</div>
                            <div className="text-xs text-muted-foreground">Escopo: {job.scopeType}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusBadgeVariant(job.jobStatus)}>{jobStatusLabels[job.jobStatus]}</Badge>
                          </TableCell>
                          <TableCell>{jobModeLabels[job.mode]}</TableCell>
                          <TableCell>{job.summary?.totalContacts || 0}</TableCell>
                          <TableCell>{formatDateTime(job.startedAt)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" onClick={() => openJobDetails(job.id)}>
                                Detalhes
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleDownloadCsv(job.id)}>
                                <Download className="mr-2 h-4 w-4" />
                                CSV
                              </Button>
                              <Button size="sm" variant="secondary" onClick={() => handleReprocess(job.id)}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Reprocessar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detalhe do job selecionado</CardTitle>
                <CardDescription>Acao por contato, reprocessamento fino e deep-link para o Chatwoot.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedJob ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-5">
                      <div className="rounded-lg border p-4">
                        <div className="text-sm text-muted-foreground">Total</div>
                        <div className="mt-2 text-2xl font-semibold">{selectedJob.summary?.totalContacts || 0}</div>
                      </div>
                      <div className="rounded-lg border p-4">
                        <div className="text-sm text-muted-foreground">Safe direct</div>
                        <div className="mt-2 text-2xl font-semibold">{selectedJob.summary?.safeDirectImport || 0}</div>
                      </div>
                      <div className="rounded-lg border p-4">
                        <div className="text-sm text-muted-foreground">Concluidos</div>
                        <div className="mt-2 text-2xl font-semibold">{selectedJob.summary?.completed || 0}</div>
                      </div>
                      <div className="rounded-lg border p-4">
                        <div className="text-sm text-muted-foreground">Falhas</div>
                        <div className="mt-2 text-2xl font-semibold">{selectedJob.summary?.failed || 0}</div>
                      </div>
                      <div className="rounded-lg border p-4">
                        <div className="text-sm text-muted-foreground">Ignorados</div>
                        <div className="mt-2 text-2xl font-semibold">{selectedJob.summary?.skipped || selectedJob.summary?.ignored || 0}</div>
                      </div>
                    </div>
                    {selectedJob.errorMessage ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{selectedJob.errorMessage}</div> : null}
                    {selectedJob.report ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-lg border p-4 text-sm">
                          <div className="font-medium">Metadados do job</div>
                          <div className="mt-2 text-muted-foreground">CSV: {selectedJob.report.csv?.fileName || "--"}</div>
                          <div className="text-muted-foreground">sourceJobId: {selectedJob.report.execution?.sourceJobId || "--"}</div>
                          <div className="text-muted-foreground">selectionMode: {selectedJob.report.execution?.selectionMode || "--"}</div>
                        </div>
                        <div className="rounded-lg border p-4 text-sm">
                          <div className="font-medium">Dependencias</div>
                          <div className="mt-2 space-y-1 text-muted-foreground">
                            {(selectedJob.report.dependencies || []).map((dependency) => (
                              <div key={dependency.code}>{dependency.message}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}
                    {renderContactsTable(visibleContacts)}
                    <Button variant="outline" onClick={() => refetchSelectedJob()} disabled={selectedJobLoading}>
                      <RefreshCw className={cn("mr-2 h-4 w-4", selectedJobLoading && "animate-spin")} />
                      Atualizar detalhe
                    </Button>
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">Selecione um job para ver detalhes.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="conflict-review">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle>Conflict Review</CardTitle>
                    <CardDescription>Triagem dos contatos com overlap, alias `@lid` ou rebuild sugerido.</CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => refetchConflicts()} disabled={conflictsLoading}>
                    <RefreshCw className={cn("mr-2 h-4 w-4", conflictsLoading && "animate-spin")} />
                    Atualizar conflitos
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">Conflitos ativos</div>
                    <div className="mt-2 text-2xl font-semibold">{visibleConflicts.length}</div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">Alias @lid</div>
                    <div className="mt-2 text-2xl font-semibold">{visibleConflicts.filter((contact) => contact.classification === "lid_alias").length}</div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">Needs review / rebuild</div>
                    <div className="mt-2 text-2xl font-semibold">{visibleConflicts.filter((contact) => contact.classification !== "lid_alias").length}</div>
                  </div>
                </div>
                {renderContactsTable(visibleConflicts, { showJob: true })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Separacao de responsabilidade</CardTitle>
                <CardDescription>O cockpit organiza o pre-plano; o Chatwoot valida a conversa final.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ShieldAlert className="h-4 w-4" />
                    Evolution
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">Dry run, analise de risco, classificacao, execucao de job, reprocessamento e CSV.</p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    Chatwoot
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">Escolha da conversa canonica, validacao visual da timeline e checagem final da UX do agente.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      <Dialog open={isJobDetailsDialogOpen} onOpenChange={setIsJobDetailsDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do job</DialogTitle>
            <DialogDescription>Resumo rapido do job e motivo da falha quando houver erro na execucao.</DialogDescription>
          </DialogHeader>

          {!selectedJobId ? (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">Selecione um job para ver os detalhes.</div>
          ) : selectedJobLoading || !selectedJobDetails ? (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">Carregando detalhes do job...</div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusBadgeVariant(selectedJobDetails.jobStatus)}>{jobStatusLabels[selectedJobDetails.jobStatus]}</Badge>
                <Badge variant="outline">{jobModeLabels[selectedJobDetails.mode]}</Badge>
                <Badge variant="outline">Escopo {selectedJobDetails.scopeType}</Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border p-4 text-sm">
                  <div className="font-medium">Identificacao</div>
                  <div className="mt-2 space-y-1 text-muted-foreground">
                    <div>Job: {selectedJobDetails.id}</div>
                    <div>Inicio: {formatDateTime(selectedJobDetails.startedAt)}</div>
                    <div>Fim: {formatDateTime(selectedJobDetails.finishedAt)}</div>
                    <div>Contatos: {selectedJobDetails.summary?.totalContacts || 0}</div>
                  </div>
                </div>
                <div className="rounded-lg border p-4 text-sm">
                  <div className="font-medium">Resumo de execucao</div>
                  <div className="mt-2 space-y-1 text-muted-foreground">
                    <div>Concluidos: {selectedJobDetails.summary?.completed || 0}</div>
                    <div>Falhas: {selectedJobDetails.summary?.failed || 0}</div>
                    <div>Ignorados: {selectedJobDetails.summary?.skipped || selectedJobDetails.summary?.ignored || 0}</div>
                    <div>Safe direct: {selectedJobDetails.summary?.safeDirectImport || 0}</div>
                  </div>
                </div>
              </div>

              {selectedJobDetails.errorMessage ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                  <div className="font-medium">Falha do job</div>
                  <div className="mt-1">{selectedJobDetails.errorMessage}</div>
                </div>
              ) : null}

              {selectedJobFailureReasons.length > 0 ? (
                <div className="rounded-lg border p-4 text-sm">
                  <div className="font-medium">Falhas por contato</div>
                  <div className="mt-3 space-y-3">
                    {selectedJobFailureReasons.map((failure) => (
                      <div key={failure.key} className="rounded-md border border-destructive/20 bg-destructive/5 p-3">
                        <div className="font-medium">
                          {failure.displayName} <span className="text-muted-foreground">({failure.remoteJid})</span>
                        </div>
                        <div className="mt-1 text-destructive">{failure.error}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {!selectedJobDetails.errorMessage && selectedJobFailureReasons.length === 0 ? (
                <div className="rounded-lg border p-4 text-sm text-muted-foreground">Esse job nao registrou erro detalhado no topo. Se houve problema, ele aparece na tabela detalhada dos contatos.</div>
              ) : null}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => refetchSelectedJob()} disabled={selectedJobLoading || !selectedJobId}>
              <RefreshCw className={cn("mr-2 h-4 w-4", selectedJobLoading && "animate-spin")} />
              Atualizar detalhe
            </Button>
            <Button type="button" variant="ghost" onClick={() => setIsJobDetailsDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(mergeDialogContact)} onOpenChange={(open) => (!open ? closeMergeDialog() : undefined)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Escolher conversa canonica para o merge</DialogTitle>
            <DialogDescription>
              O merge preserva audio, imagem e anexos que ja estao no Chatwoot. Somente as mensagens extras do Evolution entram na conversa canonica escolhida.
            </DialogDescription>
          </DialogHeader>
          {mergeDialogContact ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
                <div className="font-medium">Conflito detectado</div>
                <div className="mt-2 text-muted-foreground">{buildConflictSummary(mergeDialogContact) || "Ha diferenca entre o historico do Evolution e o que ja existe no Chatwoot."}</div>
                <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                  <div>Contato: {getDisplayName(mergeDialogContact)}</div>
                  <div>Remote JID: {mergeDialogContact.remoteJid}</div>
                  <div>Inbox alvo: {mergeDialogReviewPayload?.chatwootInboxId || "--"}</div>
                  <div>Inboxes relacionadas: {mergeDialogRelatedInboxIds.length ? mergeDialogRelatedInboxIds.join(", ") : "--"}</div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                <div className="space-y-3">
                  <div className="text-sm font-medium">Conversas candidatas no Chatwoot</div>
                  {mergeDialogCandidateConversations.length > 0 ? (
                    <ScrollArea className="max-h-[420px] rounded-md border p-3">
                      <div className="space-y-3">
                        {mergeDialogCandidateConversations.map((candidate) => {
                          const isCanonical = mergeDialogSelectedCanonicalConversationId === candidate.internalId;

                          return (
                            <div
                              key={`${mergeDialogContact.jobId}:${mergeDialogContact.remoteJid}:merge-dialog:${candidate.internalId}`}
                              className={cn(
                                "w-full rounded-md border p-3 text-left transition-colors",
                                isCanonical ? "border-primary bg-primary/5" : "bg-background hover:border-primary/40",
                              )}>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <button type="button" onClick={() => setCanonicalConversation(mergeDialogContact, candidate.internalId)} className="flex items-center gap-2 text-left">
                                  <input checked={isCanonical} readOnly className="h-4 w-4 accent-primary" type="radio" />
                                  <span className="font-medium">#{candidate.displayId}</span>
                                </button>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant={getConversationStatusVariant(candidate.status)}>{getConversationStatusLabel(candidate.status)}</Badge>
                                  <Badge variant="outline">Inbox {candidate.inboxId || "--"}</Badge>
                                  {candidate.attachmentMessageCount > 0 ? <Badge variant="secondary">Midia {candidate.attachmentMessageCount}</Badge> : null}
                                  {candidate.overlapCount > 0 ? <Badge variant="outline">Overlap {candidate.overlapCount}</Badge> : null}
                                </div>
                              </div>
                              <div className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                                <div>Interna: {candidate.internalId}</div>
                                <div>Mensagens: {candidate.messageCount}</div>
                                <div>Primeira: {formatDateTime(candidate.firstMessageAt)}</div>
                                <div>Ultima: {formatDateTime(candidate.lastMessageAt || candidate.lastActivityAt)}</div>
                              </div>
                              {candidate.reviewUrl ? (
                                <div className="mt-3">
                                  <Button type="button" size="sm" variant="ghost" onClick={(event) => { event.stopPropagation(); openExternal(candidate.reviewUrl); }}>
                                    Abrir no Chatwoot
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                      Nenhuma conversa candidata foi encontrada no inbox alvo. O merge pode criar uma nova conversa canonica.
                    </div>
                  )}
                </div>

                <div className="space-y-3 rounded-lg border p-4">
                  <div className="text-sm font-medium">Decisao do merge</div>
                  <div className="text-sm text-muted-foreground">
                    {mergeDialogSelectedCanonicalConversation
                      ? `A conversa #${mergeDialogSelectedCanonicalConversation.displayId} sera a canonica e vai manter a midia ja salva no Chatwoot.`
                      : "Nenhuma conversa canonica foi escolhida. Se continuar assim, o rebuild pode criar uma nova conversa canonica."}
                  </div>
                  <div className="grid gap-2 text-xs text-muted-foreground">
                    <div>Evolution: {mergeDialogContact.evolutionMessageCount}</div>
                    <div>Chatwoot: {mergeDialogContact.chatwootMessageCount}</div>
                    <div>Overlap: {mergeDialogContact.overlapCount}</div>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setCanonicalConversation(mergeDialogContact, null)}>
                    Criar nova canonica
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => closeMergeDialog()}>
              Cancelar
            </Button>
            <Button type="button" variant="secondary" onClick={() => handleConfirmMerge()} disabled={!mergeDialogContact || mergeDialogContact.classification === "ignored"}>
              Executar merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { Chatwoot };
