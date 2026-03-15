import { useQuery } from "@tanstack/react-query";

import { api } from "../api";
import { UseQueryParams } from "../types";
import { ChatwootHistoryJob, ChatwootHistoryJobContact, ChatwootInboxStatus, FetchChatwoot } from "./types";

interface InstanceParams {
  instanceName: string | null;
  token?: string;
}

interface JobParams extends InstanceParams {
  jobId: string | null;
}

const buildHeaders = (token?: string) => (token ? { apikey: token } : undefined);

const chatwootQueryKey = (params: Partial<InstanceParams>) => ["chatwoot", "fetchChatwoot", JSON.stringify(params)];
const chatwootInboxStatusQueryKey = (params: Partial<InstanceParams>) => ["chatwoot", "inboxStatus", JSON.stringify(params)];
const chatwootHistoryJobsQueryKey = (params: Partial<InstanceParams>) => ["chatwoot", "historyJobs", JSON.stringify(params)];
const chatwootHistoryJobQueryKey = (params: Partial<JobParams>) => ["chatwoot", "historyJob", JSON.stringify(params)];
const chatwootHistoryConflictsQueryKey = (params: Partial<InstanceParams>) => ["chatwoot", "historyConflicts", JSON.stringify(params)];

export const fetchChatwoot = async ({ instanceName, token }: Required<Pick<InstanceParams, "instanceName">> & Pick<InstanceParams, "token">) => {
  const response = await api.get(`/chatwoot/find/${instanceName}`, {
    headers: buildHeaders(token),
  });
  return response.data as FetchChatwoot;
};

export const fetchChatwootInboxStatus = async ({ instanceName, token }: Required<Pick<InstanceParams, "instanceName">> & Pick<InstanceParams, "token">) => {
  const response = await api.get(`/chatwoot/inbox/status/${instanceName}`, {
    headers: buildHeaders(token),
  });
  return response.data as ChatwootInboxStatus;
};

export const fetchChatwootHistoryJobs = async ({ instanceName, token }: Required<Pick<InstanceParams, "instanceName">> & Pick<InstanceParams, "token">) => {
  const response = await api.get(`/chatwoot/history/jobs/${instanceName}`, {
    headers: buildHeaders(token),
  });
  return response.data as ChatwootHistoryJob[];
};

export const fetchChatwootHistoryJob = async ({ instanceName, token, jobId }: { instanceName: string; token?: string; jobId: string }) => {
  const response = await api.get(`/chatwoot/history/job/${instanceName}`, {
    headers: buildHeaders(token),
    params: { jobId },
  });
  return response.data as ChatwootHistoryJob;
};

export const fetchChatwootHistoryConflicts = async ({ instanceName, token }: Required<Pick<InstanceParams, "instanceName">> & Pick<InstanceParams, "token">) => {
  const response = await api.get(`/chatwoot/history/conflicts/${instanceName}`, {
    headers: buildHeaders(token),
  });
  return response.data as ChatwootHistoryJobContact[];
};

export const useFetchChatwoot = (props: UseQueryParams<FetchChatwoot> & InstanceParams) => {
  const { instanceName, token, ...rest } = props;
  return useQuery<FetchChatwoot>({
    ...rest,
    queryKey: chatwootQueryKey({ instanceName, token }),
    queryFn: () => fetchChatwoot({ instanceName: instanceName!, token }),
    enabled: !!instanceName,
  });
};

export const useFetchChatwootInboxStatus = (props: UseQueryParams<ChatwootInboxStatus> & InstanceParams) => {
  const { instanceName, token, ...rest } = props;
  return useQuery<ChatwootInboxStatus>({
    ...rest,
    queryKey: chatwootInboxStatusQueryKey({ instanceName, token }),
    queryFn: () => fetchChatwootInboxStatus({ instanceName: instanceName!, token }),
    enabled: !!instanceName,
  });
};

export const useFetchChatwootHistoryJobs = (props: UseQueryParams<ChatwootHistoryJob[]> & InstanceParams) => {
  const { instanceName, token, ...rest } = props;
  return useQuery<ChatwootHistoryJob[]>({
    ...rest,
    queryKey: chatwootHistoryJobsQueryKey({ instanceName, token }),
    queryFn: () => fetchChatwootHistoryJobs({ instanceName: instanceName!, token }),
    enabled: !!instanceName,
  });
};

export const useFetchChatwootHistoryJob = (props: UseQueryParams<ChatwootHistoryJob> & JobParams) => {
  const { instanceName, token, jobId, ...rest } = props;
  return useQuery<ChatwootHistoryJob>({
    ...rest,
    queryKey: chatwootHistoryJobQueryKey({ instanceName, token, jobId }),
    queryFn: () => fetchChatwootHistoryJob({ instanceName: instanceName!, token, jobId: jobId! }),
    enabled: !!instanceName && !!jobId,
  });
};

export const useFetchChatwootHistoryConflicts = (props: UseQueryParams<ChatwootHistoryJobContact[]> & InstanceParams) => {
  const { instanceName, token, ...rest } = props;
  return useQuery<ChatwootHistoryJobContact[]>({
    ...rest,
    queryKey: chatwootHistoryConflictsQueryKey({ instanceName, token }),
    queryFn: () => fetchChatwootHistoryConflicts({ instanceName: instanceName!, token }),
    enabled: !!instanceName,
  });
};
