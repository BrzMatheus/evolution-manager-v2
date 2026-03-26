import { QueueConfig, QueueConfigResponse } from "@/types/evolution.types";

import { api } from "../api";
import { useManageMutation } from "../mutateQuery";

interface IParams {
  instanceName: string;
  token: string;
  data: QueueConfig;
}

const updateQueueConfig = async ({ instanceName, token, data }: IParams) => {
  const response = await api.post(`/queue/config/${instanceName}`, data, {
    headers: { apikey: token },
  });

  return response.data as { message: string; config: QueueConfigResponse["config"] };
};

export function useManageQueue() {
  const updateQueueConfigMutation = useManageMutation(updateQueueConfig, {
    invalidateKeys: [
      ["queue", "fetchQueueConfig"],
      ["queue", "fetchQueueStatus"],
    ],
  });

  return {
    updateQueueConfig: updateQueueConfigMutation,
  };
}
