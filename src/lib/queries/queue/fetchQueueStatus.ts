import { useQuery } from "@tanstack/react-query";

import { QueueStatus } from "@/types/evolution.types";

import { api } from "../api";
import { UseQueryParams } from "../types";

interface IParams {
  instanceName: string | null;
  token: string;
}

const queryKey = (params: Partial<IParams>) => ["queue", "fetchQueueStatus", JSON.stringify(params)];

export const fetchQueueStatus = async ({ instanceName, token }: IParams) => {
  const response = await api.get(`/queue/status/${instanceName}`, {
    headers: { apikey: token },
  });

  return response.data as QueueStatus;
};

export const useFetchQueueStatus = (props: UseQueryParams<QueueStatus> & Partial<IParams>) => {
  const { instanceName, token, ...rest } = props;

  return useQuery<QueueStatus>({
    ...rest,
    queryKey: queryKey({ instanceName, token }),
    queryFn: () => fetchQueueStatus({ instanceName: instanceName!, token: token! }),
    enabled: !!instanceName && !!token,
  });
};
