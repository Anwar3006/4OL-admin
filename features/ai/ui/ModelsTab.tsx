"use client";

import React, { useCallback, useState } from "react";
import { BarChart3, PauseCircle, PlayCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatKpiValue } from "@/lib/format";
import { formatDate, TYPE_LABEL } from "@/features/ai/schema/types";
import { accuracyClass, EmptyRow } from "@/features/ai/ui/shared";
import {
  useDeployAiModel,
  useUpdateAiModel,
  type AiModel,
} from "@/features/ai/data/useAiModels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const MODEL_STATUS_BADGE: Record<
  AiModel["status"],
  { label: string; variant: "emerald" | "purple" | "secondary" | "amber" }
> = {
  active: { label: "Active", variant: "emerald" },
  beta: { label: "Beta", variant: "purple" },
  staging: { label: "Staging", variant: "secondary" },
  paused: { label: "Paused", variant: "amber" },
};

export function ModelsTab({
  models,
  loading,
  usageRows,
  usageLoading,
  onRefresh,
}: {
  models: AiModel[];
  loading: boolean;
  usageRows: Array<{ model: string; requests: number; tokens: number; avgLatency: number }>;
  usageLoading: boolean;
  onRefresh: () => void;
}) {
  const [deployOpen, setDeployOpen] = useState(false);
  const updateModel = useUpdateAiModel();

  const handleTogglePause = useCallback(
    (model: AiModel) => {
      updateModel.mutate({
        id: model.id,
        status: model.status === "paused" ? "active" : "paused",
      });
    },
    [updateModel],
  );

  const handleCopyDetails = useCallback((model: AiModel) => {
    const details = [
      `Model: ${model.name} (${model.model_key})`,
      `Type: ${TYPE_LABEL[model.model_type] ?? model.model_type}`,
      `Version: ${model.version}`,
      `Accuracy: ${model.accuracy_latest ?? "—"}% (target ${model.accuracy_target}%)`,
      `Status: ${model.status}`,
    ].join("\n");
    void navigator.clipboard.writeText(details).then(
      () => toast.success("Model details copied."),
      () => toast.error("Copy failed."),
    );
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Model Registry
          </CardTitle>
          <Button type="button" size="sm" onClick={() => setDeployOpen(true)}>
            <Plus className="h-4 w-4" /> Deploy Model
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Accuracy</TableHead>
                <TableHead>Last Trained</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <EmptyRow colSpan={7} label="Loading model registry..." />}
              {!loading && models.length === 0 && (
                <EmptyRow
                  colSpan={7}
                  label="No models registered yet — deploy your first model to get started."
                />
              )}
              {!loading &&
                models.map((model) => {
                  const badge = MODEL_STATUS_BADGE[model.status];
                  return (
                    <TableRow key={model.id}>
                      <TableCell className="max-w-xs">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">
                          {model.name}
                        </div>
                        {model.description && (
                          <div className="mt-0.5 line-clamp-2 text-xs text-slate-400">
                            {model.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {TYPE_LABEL[model.model_type] ?? model.model_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{model.version}</TableCell>
                      <TableCell>
                        {model.accuracy_latest == null ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <span
                            className={`font-semibold tabular-nums ${accuracyClass(
                              model.accuracy_latest,
                              model.accuracy_target,
                            )}`}
                          >
                            {model.accuracy_latest}%
                            <span className="ml-1 text-xs font-normal text-slate-400">
                              / {model.accuracy_target}%
                            </span>
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {model.last_trained_at ? formatDate(model.last_trained_at) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            aria-label={model.status === "paused" ? "Resume model" : "Pause model"}
                            title={model.status === "paused" ? "Resume model" : "Pause model"}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                            disabled={updateModel.isPending}
                            onClick={() => handleTogglePause(model)}
                          >
                            {model.status === "paused" ? (
                              <PlayCircle className="h-4 w-4" />
                            ) : (
                              <PauseCircle className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            aria-label="Copy details"
                            title="Copy details"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            onClick={() => handleCopyDetails(model)}
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Model Usage (last 24h)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Avg Latency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usageLoading && <EmptyRow colSpan={4} label="Loading model usage..." />}
              {!usageLoading && usageRows.length === 0 && (
                <EmptyRow colSpan={4} label="No AI model calls recorded yet." />
              )}
              {!usageLoading &&
                usageRows.map((row) => (
                  <TableRow key={row.model}>
                    <TableCell className="font-semibold text-slate-800 dark:text-slate-100">
                      {row.model}
                    </TableCell>
                    <TableCell className="tabular-nums">{formatKpiValue(row.requests)}</TableCell>
                    <TableCell className="tabular-nums">{formatKpiValue(row.tokens)}</TableCell>
                    <TableCell className="tabular-nums">{row.avgLatency}ms</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DeployModelDialog open={deployOpen} onOpenChange={setDeployOpen} onDeployed={onRefresh} />
    </div>
  );
}

const DEPLOY_TYPES = Object.entries(TYPE_LABEL);

export function DeployModelDialog({
  open,
  onOpenChange,
  onDeployed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeployed: () => void;
}) {
  const deploy = useDeployAiModel();
  const [form, setForm] = useState({
    name: "",
    modelKey: "",
    description: "",
    modelType: "classification",
    version: "v1.0",
    accuracyTarget: "90",
    status: "staging",
  });

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const target = Number(form.accuracyTarget);
    if (!form.name.trim() || form.name.trim().length < 2) {
      toast.error("Model name must be at least 2 characters.");
      return;
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.modelKey.trim())) {
      toast.error("Model key must be lowercase kebab-case (e.g. symptom-classifier).");
      return;
    }
    if (!Number.isFinite(target) || target < 1 || target > 100) {
      toast.error("Accuracy target must be between 1 and 100.");
      return;
    }
    deploy.mutate(
      {
        name: form.name.trim(),
        modelKey: form.modelKey.trim(),
        description: form.description.trim() || undefined,
        modelType: form.modelType,
        version: form.version.trim() || "v1.0",
        accuracyTarget: target,
        status: form.status,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          onDeployed();
          setForm({
            name: "",
            modelKey: "",
            description: "",
            modelType: "classification",
            version: "v1.0",
            accuracyTarget: "90",
            status: "staging",
          });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Deploy Model</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deploy-name">Model name</Label>
            <Input
              id="deploy-name"
              value={form.name}
              onChange={(e) => set("name")(e.target.value)}
              placeholder="Symptom Classifier"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deploy-key">Model key</Label>
            <Input
              id="deploy-key"
              value={form.modelKey}
              onChange={(e) => set("modelKey")(e.target.value)}
              placeholder="symptom-classifier"
              className="font-mono"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.modelType} onValueChange={set("modelType")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPLOY_TYPES.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Initial status</Label>
              <Select value={form.status} onValueChange={set("status")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="beta">Beta</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deploy-version">Version</Label>
              <Input
                id="deploy-version"
                value={form.version}
                onChange={(e) => set("version")(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deploy-target">Accuracy target (%)</Label>
              <Input
                id="deploy-target"
                type="number"
                min={1}
                max={100}
                value={form.accuracyTarget}
                onChange={(e) => set("accuracyTarget")(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="deploy-description">Description</Label>
            <Textarea
              id="deploy-description"
              value={form.description}
              onChange={(e) => set("description")(e.target.value)}
              rows={2}
              placeholder="What this model does…"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={deploy.isPending}>
              {deploy.isPending ? "Deploying…" : "Deploy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
