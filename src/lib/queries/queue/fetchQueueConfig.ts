import { useQuery } from "@tanstack/react-query";

import { QueueConfigResponse } from "@/types/evolution.types";

import { api } from "../api";
import { UseQueryParams } from "../types";

interface IParams {
  instanceName: string | null;
  token: string;
}

const queryKey = (params: Partial<IParams>) => ["queue", "fetchQueueConfig", JSON.stringify(params)];

export const fetchQueueConfig = async ({ instanceName, token }: IParams) => {
  const response = await api.get(`/queue/config/${instanceName}`, {
    headers: { apikey: token },
  });

  return response.data as QueueConfigResponse;
};

export const useFetchQueueConfig = (props: UseQueryParams<QueueConfigResponse> & Partial<IParams>) => {
  const { instanceName, token, ...rest } = props;

  return useQuery<QueueConfigResponse>({
    ...rest,
    queryKey: queryKey({ instanceName, token }),
    queryFn: () => fetchQueueConfig({ instanceName: instanceName!, token: token! }),
    enabled: !!instanceName && !!token,
  });
};
