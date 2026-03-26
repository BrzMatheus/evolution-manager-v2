import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormInput, FormSwitch } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Separator } from "@/components/ui/separator";

import { useInstance } from "@/contexts/InstanceContext";

import { useFetchQueueConfig } from "@/lib/queries/queue/fetchQueueConfig";
import { useFetchQueueStatus } from "@/lib/queries/queue/fetchQueueStatus";
import { useManageQueue } from "@/lib/queries/queue/manageQueue";

import { QueueConfig } from "@/types/evolution.types";

const priorityKeys = ["high", "medium", "low"] as const;
const modeKeys = ["normal", "congested", "critical"] as const;

const formSchema = z.object({
  enabled: z.boolean(),
  delays: z.object({
    normal: z.object({
      high: z.object({ min: z.coerce.number().min(0), max: z.coerce.number().min(0) }),
      medium: z.object({ min: z.coerce.number().min(0), max: z.coerce.number().min(0) }),
      low: z.object({ min: z.coerce.number().min(0), max: z.coerce.number().min(0) }),
    }),
    congested: z.object({
      high: z.object({ min: z.coerce.number().min(0), max: z.coerce.number().min(0) }),
      medium: z.object({ min: z.coerce.number().min(0), max: z.coerce.number().min(0) }),
      low: z.object({ min: z.coerce.number().min(0), max: z.coerce.number().min(0) }),
    }),
    critical: z.object({
      high: z.object({ min: z.coerce.number().min(0), max: z.coerce.number().min(0) }),
      medium: z.object({ min: z.coerce.number().min(0), max: z.coerce.number().min(0) }),
      low: z.object({ min: z.coerce.number().min(0), max: z.coerce.number().min(0) }),
    }),
  }),
  sla: z.object({
    high: z.coerce.number().min(0),
    medium: z.coerce.number().min(0),
    low: z.coerce.number().min(0),
  }),
  maxQueueSize: z.object({
    high: z.coerce.number().min(0),
    medium: z.coerce.number().min(0),
    low: z.coerce.number().min(0),
  }),
  maxPendingPerConversation: z.coerce.number().min(0),
  maxETAMs: z.coerce.number().min(0),
  consolidation: z.object({
    enabled: z.boolean(),
    windowMs: z.coerce.number().min(0),
    separator: z.string(),
    maxMessages: z.coerce.number().min(0),
  }),
  perConversation: z.object({
    minIntervalMs: z.coerce.number().min(0),
    lockAfterSendMs: z.coerce.number().min(0),
  }),
  congestion: z.object({
    warnThresholdMs: z.coerce.number().min(0),
    criticalThresholdMs: z.coerce.number().min(0),
  }),
  deduplication: z.object({
    enabled: z.boolean(),
    windowMs: z.coerce.number().min(0),
  }),
  typing: z.object({
    enabled: z.boolean(),
    durationMs: z.object({
      min: z.coerce.number().min(0),
      max: z.coerce.number().min(0),
    }),
  }),
});

type FormSchemaType = z.infer<typeof formSchema>;

const defaultValues: FormSchemaType = {
  enabled: false,
  delays: {
    normal: {
      high: { min: 4000, max: 10000 },
      medium: { min: 15000, max: 30000 },
      low: { min: 30000, max: 60000 },
    },
    congested: {
      high: { min: 2000, max: 6000 },
      medium: { min: 8000, max: 15000 },
      low: { min: 0, max: 0 },
    },
    critical: {
      high: { min: 1000, max: 3000 },
      medium: { min: 0, max: 0 },
      low: { min: 0, max: 0 },
    },
  },
  sla: {
    high: 90000,
    medium: 600000,
    low: 1800000,
  },
  maxQueueSize: {
    high: 50,
    medium: 100,
    low: 50,
  },
  maxPendingPerConversation: 3,
  maxETAMs: 900000,
  consolidation: {
    enabled: true,
    windowMs: 8000,
    separator: "\n",
    maxMessages: 5,
  },
  perConversation: {
    minIntervalMs: 20000,
    lockAfterSendMs: 25000,
  },
  congestion: {
    warnThresholdMs: 600000,
    criticalThresholdMs: 1200000,
  },
  deduplication: {
    enabled: true,
    windowMs: 30000,
  },
  typing: {
    enabled: true,
    durationMs: {
      min: 2000,
      max: 5000,
    },
  },
};

const metricFormatter = new Intl.NumberFormat("en-US");

function Queue() {
  const { t } = useTranslation();
  const { instance } = useInstance();
  const [saving, setSaving] = useState(false);

  const { updateQueueConfig } = useManageQueue();
  const { data: queueConfig, isLoading } = useFetchQueueConfig({
    instanceName: instance?.name,
    token: instance?.token,
  });
  const { data: queueStatus } = useFetchQueueStatus({
    instanceName: instance?.name,
    token: instance?.token,
    refetchInterval: 15000,
  });

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  useEffect(() => {
    if (queueConfig?.config) {
      form.reset(queueConfig.config);
    }
  }, [form, queueConfig]);

  const onSubmit = async (data: FormSchemaType) => {
    if (!instance?.name) return;

    setSaving(true);
    try {
      await updateQueueConfig({
        instanceName: instance.name,
        token: instance.token,
        data: data as QueueConfig,
      });
      toast.success(t("queue.toast.success"));
    } catch (error: any) {
      console.error(t("queue.toast.error"), error);
      toast.error(error?.response?.data?.response?.message || t("queue.toast.error"));
    } finally {
      setSaving(false);
    }
  };

  const statusVariant = useMemo(() => {
    if (!queueStatus?.enabled) return "secondary";
    if (queueStatus.congestionMode === "critical") return "destructive";
    if (queueStatus.congestionMode === "congested") return "warning";
    return "default";
  }, [queueStatus]);

  const summaryMetrics = useMemo(
    () => [
      { label: t("queue.status.metrics.pending"), value: queueStatus?.queueSize ?? 0 },
      { label: t("queue.status.metrics.sent"), value: queueStatus?.sentCount ?? 0 },
      { label: t("queue.status.metrics.dropped"), value: queueStatus?.droppedCount ?? 0 },
      { label: t("queue.status.metrics.promoted"), value: queueStatus?.promotedCount ?? 0 },
    ],
    [queueStatus, t],
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">
        <div>
          <h3 className="mb-1 text-lg font-medium">{t("queue.title")}</h3>
          <Separator className="my-4" />

          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <CardTitle className="text-base">{t("queue.status.title")}</CardTitle>
                  <p className="text-sm text-muted-foreground">{queueStatus?.message || t("queue.status.description")}</p>
                </div>
                <Badge variant={statusVariant}>{queueStatus?.enabled ? t(`queue.status.mode.${queueStatus.congestionMode || "normal"}`) : t("queue.status.disabled")}</Badge>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {summaryMetrics.map((metric) => (
                  <div key={metric.label} className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">{metric.label}</p>
                    <p className="mt-1 text-2xl font-semibold">{metricFormatter.format(metric.value)}</p>
                  </div>
                ))}
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">{t("queue.status.metrics.eta")}</p>
                  <p className="mt-1 text-2xl font-semibold">{metricFormatter.format(queueStatus?.etaMs ?? 0)} ms</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">{t("queue.status.metrics.avgDelay")}</p>
                  <p className="mt-1 text-2xl font-semibold">{metricFormatter.format(queueStatus?.sentDelayAvgMs ?? 0)} ms</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">{t("queue.status.metrics.last5m")}</p>
                  <p className="mt-1 text-2xl font-semibold">{metricFormatter.format(queueStatus?.droppedLast5min ?? 0)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">{t("queue.status.metrics.modeChanges")}</p>
                  <p className="mt-1 text-2xl font-semibold">{metricFormatter.format(queueStatus?.modeChanges ?? 0)}</p>
                </div>
              </CardContent>
            </Card>

            <div className="mx-4 space-y-2 divide-y">
              <div className="p-4">
                <FormSwitch name="enabled" label={t("queue.form.enabled.label")} className="w-full justify-between" helper={t("queue.form.enabled.description")} />
              </div>

              <div className="space-y-4 p-4">
                <div>
                  <h4 className="text-sm font-medium">{t("queue.sections.capacity")}</h4>
                  <p className="text-sm text-muted-foreground">{t("queue.sections.capacityDescription")}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  <FormInput name="maxPendingPerConversation" label={t("queue.form.maxPendingPerConversation.label")}>
                    <Input type="number" min={0} />
                  </FormInput>
                  <FormInput name="maxETAMs" label={t("queue.form.maxETAMs.label")}>
                    <Input type="number" min={0} />
                  </FormInput>
                  {priorityKeys.map((priority) => (
                    <FormInput key={priority} name={`maxQueueSize.${priority}`} label={t(`queue.priority.${priority}`)}>
                      <Input type="number" min={0} />
                    </FormInput>
                  ))}
                </div>
              </div>

              <div className="space-y-4 p-4">
                <div>
                  <h4 className="text-sm font-medium">{t("queue.sections.sla")}</h4>
                  <p className="text-sm text-muted-foreground">{t("queue.sections.slaDescription")}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {priorityKeys.map((priority) => (
                    <FormInput key={priority} name={`sla.${priority}`} label={t(`queue.priority.${priority}`)}>
                      <Input type="number" min={0} />
                    </FormInput>
                  ))}
                </div>
              </div>

              <div className="space-y-4 p-4">
                <div>
                  <h4 className="text-sm font-medium">{t("queue.sections.delays")}</h4>
                  <p className="text-sm text-muted-foreground">{t("queue.sections.delaysDescription")}</p>
                </div>
                <div className="space-y-4">
                  {modeKeys.map((mode) => (
                    <Card key={mode}>
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base">{t(`queue.mode.${mode}`)}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {priorityKeys.map((priority) => (
                          <div key={`${mode}-${priority}`} className="grid gap-4 sm:grid-cols-[10rem_1fr_1fr] sm:items-end">
                            <div className="text-sm font-medium">{t(`queue.priority.${priority}`)}</div>
                            <FormInput name={`delays.${mode}.${priority}.min`} label={t("queue.form.delayMin.label")}>
                              <Input type="number" min={0} />
                            </FormInput>
                            <FormInput name={`delays.${mode}.${priority}.max`} label={t("queue.form.delayMax.label")}>
                              <Input type="number" min={0} />
                            </FormInput>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="space-y-4 p-4">
                <div>
                  <h4 className="text-sm font-medium">{t("queue.sections.optimizations")}</h4>
                  <p className="text-sm text-muted-foreground">{t("queue.sections.optimizationsDescription")}</p>
                </div>

                <div className="space-y-4 rounded-lg border p-4">
                  <FormSwitch
                    name="consolidation.enabled"
                    label={t("queue.form.consolidationEnabled.label")}
                    className="w-full justify-between"
                    helper={t("queue.form.consolidationEnabled.description")}
                  />
                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormInput name="consolidation.windowMs" label={t("queue.form.consolidationWindowMs.label")}>
                      <Input type="number" min={0} />
                    </FormInput>
                    <FormInput name="consolidation.maxMessages" label={t("queue.form.consolidationMaxMessages.label")}>
                      <Input type="number" min={0} />
                    </FormInput>
                    <FormInput name="consolidation.separator" label={t("queue.form.consolidationSeparator.label")}>
                      <Input />
                    </FormInput>
                  </div>
                </div>

                <div className="space-y-4 rounded-lg border p-4">
                  <FormSwitch
                    name="deduplication.enabled"
                    label={t("queue.form.deduplicationEnabled.label")}
                    className="w-full justify-between"
                    helper={t("queue.form.deduplicationEnabled.description")}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormInput name="deduplication.windowMs" label={t("queue.form.deduplicationWindowMs.label")}>
                      <Input type="number" min={0} />
                    </FormInput>
                  </div>
                </div>

                <div className="space-y-4 rounded-lg border p-4">
                  <FormSwitch name="typing.enabled" label={t("queue.form.typingEnabled.label")} className="w-full justify-between" helper={t("queue.form.typingEnabled.description")} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormInput name="typing.durationMs.min" label={t("queue.form.typingMin.label")}>
                      <Input type="number" min={0} />
                    </FormInput>
                    <FormInput name="typing.durationMs.max" label={t("queue.form.typingMax.label")}>
                      <Input type="number" min={0} />
                    </FormInput>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-4">
                <div>
                  <h4 className="text-sm font-medium">{t("queue.sections.flowControl")}</h4>
                  <p className="text-sm text-muted-foreground">{t("queue.sections.flowControlDescription")}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormInput name="perConversation.minIntervalMs" label={t("queue.form.minIntervalMs.label")}>
                    <Input type="number" min={0} />
                  </FormInput>
                  <FormInput name="perConversation.lockAfterSendMs" label={t("queue.form.lockAfterSendMs.label")}>
                    <Input type="number" min={0} />
                  </FormInput>
                  <FormInput name="congestion.warnThresholdMs" label={t("queue.form.warnThresholdMs.label")}>
                    <Input type="number" min={0} />
                  </FormInput>
                  <FormInput name="congestion.criticalThresholdMs" label={t("queue.form.criticalThresholdMs.label")}>
                    <Input type="number" min={0} />
                  </FormInput>
                </div>
              </div>

              <div className="flex justify-end p-4 pt-6">
                <Button type="submit" disabled={saving}>
                  {saving ? t("queue.button.saving") : t("queue.button.save")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}

export { Queue };
