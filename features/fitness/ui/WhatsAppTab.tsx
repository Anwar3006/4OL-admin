"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Loader2,
  MessageSquare,
  Plug,
  Plus,
  Send,
  Settings2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import KpiCard from "@/components/redesign/KpiCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import { useHasPermission } from "@/stores/permission-context";

type WaStats = {
  community_members: number;
  active_groups: number;
  messages_sent: number;
  avg_open_rate: number | null;
};

type WaGroup = {
  id: string;
  name: string;
  description: string | null;
  group_type: string;
  linked_to: string;
  member_count: number;
  status: string;
  last_message_at: string | null;
};

type WaTemplate = {
  id: string;
  name: string;
  category: string | null;
  status: string;
};

type WaBroadcast = {
  id: string;
  name: string;
  template_id: string | null;
  group_id: string | null;
  message: string;
  scheduled_at: string | null;
  sent_at: string | null;
  status: string;
  delivery_stats: Record<string, number> | null;
  created_at: string;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/**
 * Fitness → WhatsApp tab (Gap Analysis Part T, T-D2). WhatsApp is a channel
 * of the notifications pipeline, not a silo: broadcasts queue into
 * whatsapp_broadcasts and delivery runs through the Edge Function layer
 * (T-D3). Broadcast + group creation are whatsapp.broadcast-gated
 * (super_admin); everyone else with whatsapp.view gets the read surface.
 */
export default function WhatsAppTab() {
  const canBroadcast = useHasPermission("whatsapp.broadcast");
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [stats, setStats] = useState<WaStats | null>(null);
  const [groups, setGroups] = useState<WaGroup[]>([]);
  const [templates, setTemplates] = useState<WaTemplate[]>([]);
  const [broadcasts, setBroadcasts] = useState<WaBroadcast[]>([]);
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setConfigured(false);
        return;
      }
      if (!res.ok) throw new Error(json.error || "Failed to load WhatsApp data.");
      setConfigured(Boolean(json.configured));
      setStats(json.stats ?? null);
      setGroups(json.groups ?? []);
      setTemplates(json.templates ?? []);
      setBroadcasts(json.broadcasts ?? []);
    } catch {
      setConfigured(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!configured && !loading) {
    return (
      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-500/15 text-amber-900">
        <MessageSquare className="h-4 w-4" />
        <AlertDescription>
          WhatsApp community data is unavailable — either the migration has not
          been applied or you lack the whatsapp.view permission.
        </AlertDescription>
      </Alert>
    );
  }

  const approvedTemplates = templates.filter((t) => t.status === "approved");

  // Real per-broadcast sent volume, chronological — the only series here
  // with genuine, evenly-meaningful history (broadcasts already fetched
  // above, ordered by created_at). Everything else in `stats` is a single
  // current snapshot number with no history to chart.
  const recentSentBroadcasts = [...broadcasts]
    .filter((b) => b.sent_at)
    .sort((a, b) => new Date(a.sent_at!).getTime() - new Date(b.sent_at!).getTime())
    .slice(-12);
  const sentTrend = recentSentBroadcasts.map((b) => Number(b.delivery_stats?.sent ?? b.delivery_stats?.delivered ?? 0));
  const sentTrendPoints = recentSentBroadcasts.map((b) => ({
    label: b.name,
    value: Number(b.delivery_stats?.sent ?? b.delivery_stats?.delivered ?? 0),
  }));
  const hasSentTrend = sentTrend.length >= 2;
  const lastSent = sentTrend[sentTrend.length - 1] ?? 0;
  const prevSent = sentTrend[sentTrend.length - 2] ?? 0;
  const sentPct = hasSentTrend && prevSent > 0 ? Math.round(((lastSent - prevSent) / prevSent) * 100) : null;
  // "flat" (equal to the prior broadcast, a real comparison) is a distinct
  // amber signal from "neutral" (fewer than 2 sent broadcasts to compare).
  const sentDirection: "up" | "down" | "flat" | "neutral" = !hasSentTrend
    ? "neutral"
    : lastSent > prevSent
      ? "up"
      : lastSent < prevSent
        ? "down"
        : "flat";

  return (
    <div className="space-y-4">
      <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
        <MessageSquare className="h-4 w-4" />
        <AlertDescription>
          WhatsApp is an optional Fitness community channel. Members must opt in, and broadcasts can use only approved Meta templates. Delivery status is shown below after Meta sends a receipt.
        </AlertDescription>
      </Alert>

      {/*
        Only Messages Sent gets a chart — it's the one metric with a real,
        evenly-ordered history (sent volume per broadcast). It gets the
        wide slot only once that history exists (>= 2 sent broadcasts);
        until then it's a plain compact number like its siblings.
      */}
      <div className="space-y-4">
        <KpiCard
          icon={<Send className="size-4" />}
          label="Messages Sent"
          value={loading ? "..." : stats?.messages_sent ?? 0}
          delta={
            !hasSentTrend
              ? undefined
              : sentDirection === "flat"
                ? "Same as last broadcast"
                : sentPct != null
                  ? `${Math.abs(sentPct)}% vs last broadcast`
                  : "vs last broadcast"
          }
          deltaType={sentDirection}
          trend={hasSentTrend ? sentTrendPoints : undefined}
          variant="purple"
          isLoading={loading}
          size={hasSentTrend ? "lg" : "default"}
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            icon={<Users className="size-4" />}
            label="Community Members"
            value={loading ? "..." : stats?.community_members ?? 0}
            variant="green"
            isLoading={loading}
            size="sm"
          />
          <KpiCard
            icon={<BarChart3 className="size-4" />}
            label="Avg Open Rate"
            value={loading ? "..." : stats?.avg_open_rate != null ? `${stats.avg_open_rate}%` : "—"}
            variant="amber"
            isLoading={loading}
            size="sm"
          />
          <KpiCard
            icon={<MessageSquare className="size-4" />}
            label="Active Groups"
            value={loading ? "..." : stats?.active_groups ?? 0}
            variant="blue"
            isLoading={loading}
            size="sm"
          />
        </div>
      </div>

      {canBroadcast && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => setBroadcastDialogOpen(true)}>
            <Send className="h-4 w-4" />
            Bulk Broadcast
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setGroupDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            New Group
          </Button>
          <Link href="/notifications?tab=best-time">
            <Button type="button" size="sm" variant="outline">
              <BarChart3 className="h-4 w-4" />
              Engagement Report
            </Button>
          </Link>
          <Link href="/settings?tab=integrations">
            <Button type="button" size="sm" variant="outline">
              <Plug className="h-4 w-4" />
              Connect WhatsApp API
            </Button>
          </Link>
          <Button type="button" size="sm" variant="outline" disabled title="Phase 2 — needs inbound message storage (T-D6)">
            <Settings2 className="h-4 w-4" />
            Auto-Reply Rules
          </Button>
        </div>
      )}

      {canBroadcast && (
        <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-white dark:border-emerald-500/30 dark:from-emerald-500/10 dark:to-slate-900">
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base font-black">Quick Broadcast</CardTitle>
              <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                Send now or schedule a message to a Fitness group using one of {approvedTemplates.length} approved templates.
              </p>
            </div>
            <Button type="button" onClick={() => setBroadcastDialogOpen(true)} disabled={approvedTemplates.length === 0}>
              <Send className="h-4 w-4" /> Compose broadcast
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Fitness Groups ({groups.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Members</TableHead>
                <TableHead>Last Message</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-slate-400">
                    Loading groups...
                  </TableCell>
                </TableRow>
              ) : groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-slate-400">
                    No WhatsApp groups yet.
                  </TableCell>
                </TableRow>
              ) : (
                groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="min-w-[220px] whitespace-normal">
                      <div className="font-medium text-slate-800 dark:text-slate-100">{group.name}</div>
                      {group.description && (
                        <div className="mt-1 line-clamp-1 text-xs text-slate-500">{group.description}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {group.group_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{group.member_count}</TableCell>
                    <TableCell>{formatDate(group.last_message_at)}</TableCell>
                    <TableCell>
                      <Badge variant={group.status === "active" ? "emerald" : "secondary"} className="capitalize">
                        {group.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Recent Broadcasts ({broadcasts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Broadcast</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Sent / Scheduled</TableHead>
                <TableHead className="text-right">Sent To</TableHead>
                <TableHead className="text-right">Open Rate</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-slate-400">
                    Loading broadcasts...
                  </TableCell>
                </TableRow>
              ) : broadcasts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-slate-400">
                    No broadcasts queued.
                  </TableCell>
                </TableRow>
              ) : (
                broadcasts.map((broadcast) => {
                  const groupName = groups.find((g) => g.id === broadcast.group_id)?.name;
                  const template = templates.find((item) => item.id === broadcast.template_id);
                  const sentTo = Number(broadcast.delivery_stats?.sent ?? broadcast.delivery_stats?.delivered ?? 0);
                  const opened = Number(broadcast.delivery_stats?.opened ?? broadcast.delivery_stats?.read ?? 0);
                  const openRate = sentTo ? Math.round((opened / sentTo) * 100) : null;
                  return (
                    <TableRow key={broadcast.id}>
                      <TableCell className="min-w-[240px] whitespace-normal">
                        <div className="font-medium text-slate-800 dark:text-slate-100">{broadcast.name}</div>
                        <div className="mt-1 line-clamp-2 text-xs text-slate-500">{broadcast.message}</div>
                      </TableCell>
                      <TableCell>{groupName ?? "Audience segment"}</TableCell>
                      <TableCell><Badge variant="secondary" className="capitalize">{template?.category ?? "Fitness"}</Badge></TableCell>
                      <TableCell>{formatDate(broadcast.sent_at ?? broadcast.scheduled_at)}</TableCell>
                      <TableCell className="text-right tabular-nums">{sentTo.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">{openRate == null ? "—" : `${openRate}%`}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            broadcast.status === "sent"
                              ? "emerald"
                              : broadcast.status === "failed"
                                ? "destructive"
                                : "amber"
                          }
                          className="capitalize"
                        >
                          {broadcast.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-slate-400">
        Sends run through the WhatsApp Edge Function with Meta-approved templates
        only; delivery receipts flow back into the notifications pipeline.
      </p>

      {canBroadcast && (
        <>
          <BroadcastDialog
            open={broadcastDialogOpen}
            onClose={() => setBroadcastDialogOpen(false)}
            groups={groups}
            templates={approvedTemplates}
            onCreated={() => {
              setBroadcastDialogOpen(false);
              load();
            }}
          />
          <NewGroupDialog
            open={groupDialogOpen}
            onClose={() => setGroupDialogOpen(false)}
            onCreated={() => {
              setGroupDialogOpen(false);
              load();
            }}
          />
        </>
      )}
    </div>
  );
}

function BroadcastDialog({
  open,
  onClose,
  groups,
  templates,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  groups: WaGroup[];
  templates: WaTemplate[];
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [groupId, setGroupId] = useState("all");
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim() || !message.trim() || !templateId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/whatsapp/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          message,
          templateId,
          groupId: groupId === "all" ? null : groupId,
          audienceFilter: groupId === "all" ? { whatsapp_opt_in: true } : {},
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to queue broadcast.");
      toast.success("Broadcast queued for delivery.");
      setName("");
      setMessage("");
      setTemplateId("");
      setScheduledAt("");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to queue broadcast.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>WhatsApp Bulk Broadcast</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Broadcast name" value={name} onChange={(e) => setName(e.target.value)} />
          <Select value={templateId || "none"} onValueChange={(v) => setTemplateId(v === "none" ? "" : v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Meta-approved template (required)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Select template…</SelectItem>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name} ({template.category ?? "general"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={groupId} onValueChange={setGroupId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Target audience" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All WhatsApp opt-ins</SelectItem>
              {groups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name} ({group.member_count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Message (max 1024 characters)"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 1024))}
            rows={4}
          />
          <Input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            aria-label="Schedule for (optional — leave empty to queue now)"
          />
          <Alert>
            <AlertDescription className="text-xs">
              Only Meta-approved templates can be sent; custom templates need
              ~24h approval. Targets respect recorded WhatsApp opt-in consent
              (GH-DPA).
            </AlertDescription>
          </Alert>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={submit} disabled={saving || !name.trim() || !message.trim() || !templateId}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {scheduledAt ? "Schedule" : "Queue Broadcast"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewGroupDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [groupType, setGroupType] = useState("community");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/whatsapp/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          groupType,
          linkedTo: "fitness",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to create group.");
      toast.success("Group created.");
      setName("");
      setDescription("");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create group.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New WhatsApp Group</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Group name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            placeholder="Subtitle / description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Select value={groupType} onValueChange={setGroupType}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="challenge">Challenge</SelectItem>
              <SelectItem value="community">Community</SelectItem>
              <SelectItem value="event">Event</SelectItem>
              <SelectItem value="gym">Gym</SelectItem>
              <SelectItem value="wellness">Wellness</SelectItem>
              <SelectItem value="network">HCP Network</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={submit} disabled={saving || !name.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Group
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
