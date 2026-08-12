"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarClock,
  FileText,
  Megaphone,
  RefreshCw,
  Send,
  Settings2,
  ShieldAlert,
} from "lucide-react";
import KpiCard from "@/components/redesign/KpiCard";
import PageHeader from "@/components/redesign/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  is_broadcast: boolean;
  campaign_id: string | null;
  read_at: string | null;
  created_at: string;
};

type CampaignRow = {
  id: string;
  title: string;
  body: string;
  type: string;
  scheduled_at: string | null;
  sent_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  delivery_stats: Record<string, unknown> | null;
  created_at: string;
};

type TemplateRow = {
  id: string;
  name: string;
  template_type: string;
  subject: string | null;
  body: string;
  source_module: string;
  usage_count: number | null;
  last_used_at: string | null;
  is_active: boolean;
  created_at: string;
};

type RuleRow = {
  id: string;
  name: string;
  trigger_event: string;
  source_module: string;
  channel: string[] | null;
  target_audience: string | null;
  is_active: boolean;
  last_fired_at: string | null;
  fire_count: number | null;
  created_at: string;
};

const tabs = [
  { id: "campaigns", label: "Campaigns" },
  { id: "logs", label: "Notification Log" },
  { id: "templates", label: "Templates" },
  { id: "automation", label: "Automation Rules" },
];

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function labelize(value?: string | null) {
  if (!value) return "Not set";
  return value.replaceAll("_", " ");
}

function campaignStatus(campaign: CampaignRow) {
  if (campaign.failed_at) return "failed";
  if (campaign.sent_at) return "sent";
  if (campaign.scheduled_at) return "scheduled";
  return "draft";
}

function badgeVariant(status: string) {
  if (["active", "sent", "read"].includes(status)) return "emerald";
  if (["scheduled", "draft", "unread"].includes(status)) return "amber";
  if (["failed", "inactive"].includes(status)) return "destructive";
  return "secondary";
}

function StatusBadge({ value }: { value: string }) {
  return (
    <Badge variant={badgeVariant(value)} className="capitalize">
      {labelize(value)}
    </Badge>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-24 text-center text-sm text-slate-500">
        {label}
      </TableCell>
    </TableRow>
  );
}

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState("campaigns");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [data, setData] = useState<{
    notifications: NotificationRow[];
    campaigns: CampaignRow[];
    templates: TemplateRow[];
    rules: RuleRow[];
    metrics: Record<string, number>;
  }>({
    notifications: [],
    campaigns: [],
    templates: [],
    rules: [],
    metrics: {},
  });
  const [form, setForm] = useState({
    title: "",
    body: "",
    type: "system",
    scheduled_at: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Unable to load notifications.");
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const metrics = data.metrics ?? {};
  const unreadRate = useMemo(() => {
    if (!metrics.notificationLog) return "0 unread";
    return `${metrics.unread ?? 0} unread`;
  }, [metrics.notificationLog, metrics.unread]);

  const createCampaign = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          body: form.body,
          type: form.type,
          scheduled_at: form.scheduled_at
            ? new Date(form.scheduled_at).toISOString()
            : null,
          segment_filter: { audience: "all_users" },
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Unable to create campaign.");
      }

      setForm({ title: "", body: "", type: "system", scheduled_at: "" });
      setSuccess("Campaign draft created. Delivery orchestration remains in Epic 27.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create campaign.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="Campaign drafts, notification logs, templates, and automation rules"
      >
        <Button type="button" variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh
        </Button>
      </PageHeader>

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Push delivery is intentionally not enabled here</AlertTitle>
        <AlertDescription>
          This screen manages database-backed notification campaigns and logs.
          Provider delivery, callbacks, and Firebase credential loading belong to Epic 27.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Notification data unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <Bell className="h-4 w-4" />
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={<Megaphone className="h-5 w-5" />} label="Campaigns" value={loading ? "..." : metrics.campaigns ?? 0} variant="blue" delta={`${metrics.scheduledCampaigns ?? 0} scheduled`} deltaType="neutral" />
        <KpiCard icon={<Bell className="h-5 w-5" />} label="Notifications" value={loading ? "..." : metrics.notificationLog ?? 0} variant="purple" delta={unreadRate} deltaType="neutral" />
        <KpiCard icon={<FileText className="h-5 w-5" />} label="Templates" value={loading ? "..." : metrics.activeTemplates ?? 0} variant="green" delta="Active" deltaType="up" />
        <KpiCard icon={<Settings2 className="h-5 w-5" />} label="Automation" value={loading ? "..." : metrics.activeRules ?? 0} variant="amber" delta="Active rules" deltaType="neutral" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700">
              Campaign Draft
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={createCampaign}>
              <Input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Campaign title"
                required
              />
              <Textarea
                value={form.body}
                onChange={(event) => setForm((prev) => ({ ...prev, body: event.target.value }))}
                placeholder="Notification body"
                rows={5}
                required
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Select
                  value={form.type}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, type: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="ad">Ad</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={(event) => setForm((prev) => ({ ...prev, scheduled_at: event.target.value }))}
                />
              </div>
              <Button type="submit" disabled={saving} className="w-full">
                <Send className="h-4 w-4" />
                {saving ? "Saving..." : "Save Draft"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-transparent border-b border-slate-200 h-auto p-0 flex gap-0 mb-4 justify-start overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "px-5 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400 border-b-2 border-transparent transition-all rounded-none outline-none",
                  "data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-ek-green-dark data-[state=active]:border-ek-green-dark",
                )}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="campaigns" className="outline-none">
            <CampaignsTable campaigns={data.campaigns} loading={loading} />
          </TabsContent>
          <TabsContent value="logs" className="outline-none">
            <NotificationsTable notifications={data.notifications} loading={loading} />
          </TabsContent>
          <TabsContent value="templates" className="outline-none">
            <TemplatesTable templates={data.templates} loading={loading} />
          </TabsContent>
          <TabsContent value="automation" className="outline-none">
            <RulesTable rules={data.rules} loading={loading} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function CampaignsTable({
  campaigns,
  loading,
}: {
  campaigns: CampaignRow[];
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <EmptyRow colSpan={5} label="Loading campaigns..." />}
            {!loading && campaigns.length === 0 && <EmptyRow colSpan={5} label="No campaigns found." />}
            {!loading && campaigns.map((campaign) => (
              <TableRow key={campaign.id}>
                <TableCell className="min-w-[240px] whitespace-normal">
                  <div className="font-bold text-slate-800">{campaign.title}</div>
                  <div className="mt-1 line-clamp-2 text-xs text-slate-500">{campaign.body}</div>
                </TableCell>
                <TableCell className="capitalize">{labelize(campaign.type)}</TableCell>
                <TableCell><StatusBadge value={campaignStatus(campaign)} /></TableCell>
                <TableCell>{formatDate(campaign.scheduled_at)}</TableCell>
                <TableCell>{formatDate(campaign.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function NotificationsTable({
  notifications,
  loading,
}: {
  notifications: NotificationRow[];
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Notification</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Audience</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <EmptyRow colSpan={5} label="Loading notification log..." />}
            {!loading && notifications.length === 0 && <EmptyRow colSpan={5} label="No notifications found." />}
            {!loading && notifications.map((notification) => (
              <TableRow key={notification.id}>
                <TableCell className="min-w-[260px] whitespace-normal">
                  <div className="font-bold text-slate-800">{notification.title}</div>
                  <div className="mt-1 line-clamp-2 text-xs text-slate-500">{notification.body}</div>
                </TableCell>
                <TableCell className="capitalize">{labelize(notification.type)}</TableCell>
                <TableCell>{notification.is_broadcast ? "Broadcast" : notification.user_id.slice(0, 8)}</TableCell>
                <TableCell><StatusBadge value={notification.is_read ? "read" : "unread"} /></TableCell>
                <TableCell>{formatDate(notification.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function TemplatesTable({
  templates,
  loading,
}: {
  templates: TemplateRow[];
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Template</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <EmptyRow colSpan={5} label="Loading templates..." />}
            {!loading && templates.length === 0 && <EmptyRow colSpan={5} label="No notification templates found." />}
            {!loading && templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="min-w-[240px] whitespace-normal">
                  <div className="font-bold text-slate-800">{template.name}</div>
                  <div className="mt-1 line-clamp-2 text-xs text-slate-500">{template.subject || template.body}</div>
                </TableCell>
                <TableCell className="capitalize">{labelize(template.template_type)}</TableCell>
                <TableCell>{labelize(template.source_module)}</TableCell>
                <TableCell>{template.usage_count ?? 0}</TableCell>
                <TableCell><StatusBadge value={template.is_active ? "active" : "inactive"} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function RulesTable({ rules, loading }: { rules: RuleRow[]; loading: boolean }) {
  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rule</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Channels</TableHead>
              <TableHead>Fires</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <EmptyRow colSpan={5} label="Loading automation rules..." />}
            {!loading && rules.length === 0 && <EmptyRow colSpan={5} label="No automation rules found." />}
            {!loading && rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="min-w-[220px] whitespace-normal">
                  <div className="font-bold text-slate-800">{rule.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{labelize(rule.source_module)}</div>
                </TableCell>
                <TableCell>{labelize(rule.trigger_event)}</TableCell>
                <TableCell>{(rule.channel ?? []).join(", ") || "Not set"}</TableCell>
                <TableCell>{rule.fire_count ?? 0}</TableCell>
                <TableCell><StatusBadge value={rule.is_active ? "active" : "inactive"} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
