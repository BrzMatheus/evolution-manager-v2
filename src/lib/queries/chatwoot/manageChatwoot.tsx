import { Chatwoot } from "@/types/evolution.types";

import { api } from "../api";
import { useManageMutation } from "../mutateQuery";
import {
  ChatwootHistoryAnalyzePayload,
  ChatwootHistoryContactActionPayload,
  ChatwootHistoryContactActionResponse,
  ChatwootHistoryExecutePayload,
  ChatwootHistoryJob,
  ChatwootHistoryReprocessPayload,
} from "./types";

interface MutationParams<TData> {
  instanceName: string;
  token: string;
  data: TData;
}

interface ExportChatwootHistoryCsvParams {
  instanceName: string;
  token: string;
  jobId: string;
}

const createChatwoot = async ({ instanceName, token, data }: MutationParams<Chatwoot>) => {
  const response = await api.post(`/chatwoot/set/${instanceName}`, data, {
    headers: {
      apikey: token,
    },
  });
  return response.data;
};

const analyzeChatwootHistory = async ({ instanceName, token, data }: MutationParams<ChatwootHistoryAnalyzePayload>) => {
  const response = await api.post(`/chatwoot/history/analyze/${instanceName}`, data, {
    headers: {
      apikey: token,
    },
  });
  return response.data as ChatwootHistoryJob;
};

const executeChatwootHistory = async ({ instanceName, token, data }: MutationParams<ChatwootHistoryExecutePayload>) => {
  const response = await api.post(`/chatwoot/history/execute/${instanceName}`, data, {
    headers: {
      apikey: token,
    },
  });
  return response.data as ChatwootHistoryJob;
};

const reprocessChatwootHistory = async ({ instanceName, token, data }: MutationParams<ChatwootHistoryReprocessPayload>) => {
  const response = await api.post(`/chatwoot/history/reprocess/${instanceName}`, data, {
    headers: {
      apikey: token,
    },
  });
  return response.data as ChatwootHistoryJob;
};

const contactActionChatwootHistory = async ({ instanceName, token, data }: MutationParams<ChatwootHistoryContactActionPayload>) => {
  const response = await api.post(`/chatwoot/history/contact-action/${instanceName}`, data, {
    headers: {
      apikey: token,
    },
  });
  return response.data as ChatwootHistoryContactActionResponse;
};

export const exportChatwootHistoryCsv = async ({ instanceName, token, jobId }: ExportChatwootHistoryCsvParams) => {
  const response = await api.get(`/chatwoot/history/export/${instanceName}`, {
    headers: {
      apikey: token,
    },
    params: { jobId },
    responseType: "blob",
  });
  return response.data as Blob;
};

export function useManageChatwoot() {
  const createChatwootMutation = useManageMutation(createChatwoot, {
    invalidateKeys: [["chatwoot"]],
  });
  const analyzeChatwootHistoryMutation = useManageMutation(analyzeChatwootHistory, {
    invalidateKeys: [["chatwoot"]],
  });
  const executeChatwootHistoryMutation = useManageMutation(executeChatwootHistory, {
    invalidateKeys: [["chatwoot"]],
  });
  const reprocessChatwootHistoryMutation = useManageMutation(reprocessChatwootHistory, {
    invalidateKeys: [["chatwoot"]],
  });
  const contactActionChatwootHistoryMutation = useManageMutation(contactActionChatwootHistory, {
    invalidateKeys: [["chatwoot"]],
  });

  return {
    createChatwoot: createChatwootMutation,
    analyzeChatwootHistory: analyzeChatwootHistoryMutation,
    executeChatwootHistory: executeChatwootHistoryMutation,
    reprocessChatwootHistory: reprocessChatwootHistoryMutation,
    contactActionChatwootHistory: contactActionChatwootHistoryMutation,
  };
}
