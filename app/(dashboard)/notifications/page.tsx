"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  FileText,
  Megaphone,
  RefreshCw,
  Send,
  Settings2,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import KpiCard from "@/components/redesign/KpiCard";
import PageHeader from "@/components/redesign/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  approval_status: "draft" | "pending_approval" | "approved" | "rejected";
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

const USER_TYPES = ["customer", "business_provider", "both"];
const ROLES = ["user"];
const SEXES = ["male", "female"];
const STATUSES = ["active", "inactive", "suspended"];

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
  return campaign.approval_status;
}

function badgeVariant(status: string) {
  if (["active", "sent", "read", "approved"].includes(status)) return "emerald";
  if (["scheduled", "draft", "unread", "pending_approval"].includes(status)) return "amber";
  if (["failed", "inactive", "rejected"].includes(status)) return "destructive";
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

function toggleInArray(arr: string[], value: string) {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

function CheckboxGroup({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div>
      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">
        {label}
      </Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(toggleInArray(selected, opt))}
            className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border transition-colors",
              selected.includes(opt)
                ? "bg-ek-green-dark text-white border-ek-green-dark"
                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300",
            )}
          >
            {labelize(opt)}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("campaigns");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    templateId: "",
  });
  const [audience, setAudience] = useState<"all_users" | "targeted">("all_users");
  const [userTypes, setUserTypes] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [sexes, setSexes] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [segmentPreview, setSegmentPreview] = useState<{ targetable: number; with_push_token: number } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);

  const segmentFilter = useMemo(() => {
    if (audience === "all_users") return { audience: "all_users" };
    return {
      audience: "targeted",
      ...(userTypes.length && { user_type: userTypes }),
      ...(roles.length && { role: roles }),
      ...(sexes.length && { sex: sexes }),
      ...(statuses.length && { status: statuses }),
    };
  }, [audience, userTypes, roles, sexes, statuses]);

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

  useEffect(() => {
    let cancelled = false;
    setPreviewLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/notifications/segment-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ segmentFilter }),
        });
        if (!res.ok || cancelled) return;
        setSegmentPreview(await res.json());
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [segmentFilter]);

  const metrics = data.metrics ?? {};

  const createCampaign = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          body: form.body,
          type: form.type,
          template_id: form.templateId || null,
          scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
          segment_filter: segmentFilter,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Unable to create campaign.");
      }

      setForm({ title: "", body: "", type: "system", scheduled_at: "", templateId: "" });
      setAudience("all_users");
      setUserTypes([]);
      setRoles([]);
      setSexes([]);
      setStatuses([]);
      toast.success("Campaign draft created. Submit it for approval when ready.");
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create campaign.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="Campaign builder, notification logs, templates, and automation rules"
      >
        <Button type="button" variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh
        </Button>
      </PageHeader>

      {error && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Notification data unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard icon={<Megaphone className="h-5 w-5" />} label="Campaigns" value={loading ? "..." : metrics.campaigns ?? 0} variant="blue" delta={`${metrics.scheduledCampaigns ?? 0} scheduled`} deltaType="neutral" />
        <KpiCard icon={<ShieldAlert className="h-5 w-5" />} label="Pending Approval" value={loading ? "..." : metrics.pendingApprovalCampaigns ?? 0} variant="amber" delta="Needs review" deltaType="neutral" />
        <KpiCard icon={<Bell className="h-5 w-5" />} label="Notifications" value={loading ? "..." : metrics.notificationLog ?? 0} variant="purple" delta={`${metrics.unread ?? 0} unread`} deltaType="neutral" />
        <KpiCard icon={<FileText className="h-5 w-5" />} label="Templates" value={loading ? "..." : metrics.activeTemplates ?? 0} variant="green" delta="Active" deltaType="up" />
        <KpiCard icon={<Settings2 className="h-5 w-5" />} label="Automation" value={loading ? "..." : metrics.activeRules ?? 0} variant="amber" delta="Active rules" deltaType="neutral" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_1fr]">
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
                rows={4}
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

              <Select
                value={form.templateId || "none"}
                onValueChange={(value) => setForm((prev) => ({ ...prev, templateId: value === "none" ? "" : value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Template (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template</SelectItem>
                  {data.templates.filter((t) => t.is_active).map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="border-t border-slate-100 pt-3 space-y-3">
                <Select value={audience} onValueChange={(v) => setAudience(v as typeof audience)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_users">All Users</SelectItem>
                    <SelectItem value="targeted">Targeted Segment</SelectItem>
                  </SelectContent>
                </Select>

                {audience === "targeted" && (
                  <div className="space-y-3 bg-slate-50 rounded-lg p-3">
                    <CheckboxGroup label="User Type" options={USER_TYPES} selected={userTypes} onChange={setUserTypes} />
                    <CheckboxGroup label="Role" options={ROLES} selected={roles} onChange={setRoles} />
                    <CheckboxGroup label="Sex" options={SEXES} selected={sexes} onChange={setSexes} />
                    <CheckboxGroup label="Status" options={STATUSES} selected={statuses} onChange={setStatuses} />
                  </div>
                )}

                <div className="text-[11px] font-bold text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                  {previewLoading ? "Calculating reach…" : (
                    <>
                      Reaches <span className="text-slate-900">{segmentPreview?.targetable ?? 0}</span> users,{" "}
                      <span className="text-slate-900">{segmentPreview?.with_push_token ?? 0}</span> with a push token
                    </>
                  )}
                </div>
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
            <CampaignsTable campaigns={data.campaigns} loading={loading} onRowClick={(id) => router.push(`/view-notification?id=${id}`)} />
          </TabsContent>
          <TabsContent value="logs" className="outline-none">
            <NotificationsTable notifications={data.notifications} loading={loading} />
          </TabsContent>
          <TabsContent value="templates" className="outline-none">
            <TemplatesTable
              templates={data.templates}
              loading={loading}
              onCreate={() => setTemplateDialogOpen(true)}
              onToggle={async (id, isActive) => {
                await fetch(`/api/notifications/templates/${id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ isActive }),
                });
                loadData();
              }}
            />
          </TabsContent>
          <TabsContent value="automation" className="outline-none">
            <RulesTable
              rules={data.rules}
              loading={loading}
              onCreate={() => setRuleDialogOpen(true)}
              onToggle={async (id, isActive) => {
                await fetch(`/api/notifications/rules/${id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ isActive }),
                });
                loadData();
              }}
            />
          </TabsContent>
        </Tabs>
      </div>

      <NewTemplateDialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} onCreated={loadData} />
      <NewRuleDialog open={ruleDialogOpen} onClose={() => setRuleDialogOpen(false)} onCreated={loadData} templates={data.templates} />
    </div>
  );
}

function CampaignsTable({
  campaigns,
  loading,
  onRowClick,
}: {
  campaigns: CampaignRow[];
  loading: boolean;
  onRowClick: (id: string) => void;
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
              <TableRow key={campaign.id} className="cursor-pointer hover:bg-slate-50" onClick={() => onRowClick(campaign.id)}>
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
  onCreate,
  onToggle,
}: {
  templates: TemplateRow[];
  loading: boolean;
  onCreate: () => void;
  onToggle: (id: string, isActive: boolean) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700">Templates</CardTitle>
        <Button size="sm" onClick={onCreate}>+ New Template</Button>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Template</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Active</TableHead>
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
                <TableCell>
                  <Switch checked={template.is_active} onCheckedChange={(checked) => onToggle(template.id, checked)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function RulesTable({
  rules,
  loading,
  onCreate,
  onToggle,
}: {
  rules: RuleRow[];
  loading: boolean;
  onCreate: () => void;
  onToggle: (id: string, isActive: boolean) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700">Automation Rules</CardTitle>
        <Button size="sm" onClick={onCreate}>+ New Rule</Button>
      </CardHeader>
      <CardContent className="p-0">
        <Alert className="rounded-none border-x-0 border-t-0">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Rule definitions are saved and can be toggled active/inactive, but no
            event-driven engine evaluates <code>trigger_event</code> against real
            app events yet — rules won&apos;t auto-fire until that&apos;s built.
            Fire counts stay at 0 until then.
          </AlertDescription>
        </Alert>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rule</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Channels</TableHead>
              <TableHead>Fires</TableHead>
              <TableHead>Active</TableHead>
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
                <TableCell>
                  <Switch checked={rule.is_active} onCheckedChange={(checked) => onToggle(rule.id, checked)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function NewTemplateDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [templateType, setTemplateType] = useState("push");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sourceModule, setSourceModule] = useState("marketing");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName("");
    setSubject("");
    setBody("");
    setTemplateType("push");
    setSourceModule("marketing");
  };

  const submit = async () => {
    if (!name.trim() || !body.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/notifications/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, templateType, subject: subject || null, body, sourceModule }),
      });
      if (!res.ok) throw new Error("Failed to create template");
      toast.success("Template created");
      reset();
      onClose();
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>New Template</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Template name" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Type (e.g. push, email)" value={templateType} onChange={(e) => setTemplateType(e.target.value)} />
            <Input placeholder="Source module" value={sourceModule} onChange={(e) => setSourceModule(e.target.value)} />
          </div>
          <Input placeholder="Subject (optional)" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Textarea placeholder="Body" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-24 resize-none" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !name.trim() || !body.trim()}>
              {saving ? "Creating…" : "Create Template"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewRuleDialog({
  open,
  onClose,
  onCreated,
  templates,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  templates: TemplateRow[];
}) {
  const [name, setName] = useState("");
  const [triggerEvent, setTriggerEvent] = useState("");
  const [sourceModule, setSourceModule] = useState("marketing");
  const [targetAudience, setTargetAudience] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName("");
    setTriggerEvent("");
    setSourceModule("marketing");
    setTargetAudience("");
    setTemplateId("");
  };

  const submit = async () => {
    if (!name.trim() || !triggerEvent.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/notifications/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          triggerEvent,
          sourceModule,
          channel: ["push"],
          targetAudience: targetAudience || null,
          templateId: templateId || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to create rule");
      toast.success("Automation rule created");
      reset();
      onClose();
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create rule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>New Automation Rule</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Rule name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Trigger event (e.g. user_signup)" value={triggerEvent} onChange={(e) => setTriggerEvent(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Source module" value={sourceModule} onChange={(e) => setSourceModule(e.target.value)} />
            <Input placeholder="Target audience (optional)" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} />
          </div>
          <Select value={templateId || "none"} onValueChange={(v) => setTemplateId(v === "none" ? "" : v)}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Template (optional)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No template</SelectItem>
              {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !name.trim() || !triggerEvent.trim()}>
              {saving ? "Creating…" : "Create Rule"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
