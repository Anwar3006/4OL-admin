"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  Check,
  CreditCard,
  FileCheck2,
  KeyRound,
  Loader2,
  Plug,
  RefreshCw,
  Save,
  Settings,
  ShieldCheck,
  ToggleLeft,
} from "lucide-react";
import BillingTab from "./_components/BillingTab";
import ComplianceTab from "./_components/ComplianceTab";
import NotificationsTab from "./_components/NotificationsTab";
import SecurityTab from "./_components/SecurityTab";
import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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

type PlatformSettings = {
  id: string;
  platform_name: string;
  support_email: string | null;
  support_phone: string | null;
  support_whatsapp: string | null;
  share_url: string | null;
  default_language: "en" | "twi" | "ga";
};

type FeatureFlag = {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  rollout_percentage: number;
  updated_at: string | null;
};

type ApiKeyStatus = {
  id: string;
  name: string;
  provider: string;
  environment: string;
  key_hint: string | null;
  active: boolean;
  last_used: string | null;
  source: "environment" | "database";
};

type Integration = {
  id: string;
  name: string;
  provider: string;
  status: "connected" | "disconnected" | "error" | "pending";
  webhook_url: string | null;
  updated_at: string | null;
};

type Maintenance = {
  enabled: boolean;
  message: string;
  allowedRoutes: string[];
  scheduledStart: string | null;
  scheduledEnd: string | null;
};

const tabList = [
  { id: "general", label: "General", icon: Settings },
  { id: "features", label: "Feature Flags", icon: ToggleLeft },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "api-keys", label: "API Keys", icon: KeyRound },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "billing", label: "Billing & GRA", icon: CreditCard },
  { id: "compliance", label: "Compliance", icon: FileCheck2 },
  { id: "maintenance", label: "Maintenance", icon: AlertTriangle },
];

const VALID_TABS = new Set(tabList.map((tab) => tab.id));

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyStatus[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [maintenance, setMaintenance] = useState<Maintenance | null>(null);

  const activeFlags = useMemo(
    () => flags.filter((flag) => flag.enabled).length,
    [flags],
  );
  const configuredKeys = useMemo(
    () => apiKeys.filter((key) => key.active).length,
    [apiKeys],
  );
  const connectedIntegrations = useMemo(
    () =>
      integrations.filter((integration) => integration.status === "connected")
        .length,
    [integrations],
  );

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [settingsRes, flagsRes, keysRes, integrationsRes, maintenanceRes] =
        await Promise.all([
          fetch("/api/settings", { cache: "no-store" }),
          fetch("/api/settings/feature-flags", { cache: "no-store" }),
          fetch("/api/settings/api-keys", { cache: "no-store" }),
          fetch("/api/settings/integrations", { cache: "no-store" }),
          fetch("/api/settings/maintenance", { cache: "no-store" }),
        ]);

      if (
        !settingsRes.ok ||
        !flagsRes.ok ||
        !keysRes.ok ||
        !integrationsRes.ok ||
        !maintenanceRes.ok
      ) {
        throw new Error("Unable to load one or more settings datasets.");
      }

      const [settingsJson, flagsJson, keysJson, integrationsJson, maintenanceJson] =
        await Promise.all([
          settingsRes.json(),
          flagsRes.json(),
          keysRes.json(),
          integrationsRes.json(),
          maintenanceRes.json(),
        ]);

      setSettings(settingsJson.settings);
      setFlags(flagsJson.flags ?? []);
      setApiKeys(keysJson.keys ?? []);
      setIntegrations(integrationsJson.integrations ?? []);
      setMaintenance(maintenanceJson.maintenance);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Gap P3: ?tab= URL sync — deep links (sidebar, docs) land on the right
  // tab, and tab changes update the URL without a full navigation.
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("tab");
    if (param && VALID_TABS.has(param)) setActiveTab(param);
  }, []);

  const changeTab = (tab: string) => {
    setActiveTab(tab);
    router.replace(`/settings?tab=${tab}`);
  };

  const saveGeneral = async () => {
    if (!settings) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Unable to save platform settings.");
      }

      const body = await res.json();
      setSettings(body.settings);
      setSuccess("Platform settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const toggleFlag = async (flag: FeatureFlag) => {
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/settings/feature-flags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...flag, enabled: !flag.enabled }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Unable to update feature flag.");
      }

      const body = await res.json();
      setFlags((current) =>
        current.map((item) => (item.id === body.flag.id ? body.flag : item)),
      );
      setSuccess(`${flag.name} ${flag.enabled ? "disabled" : "enabled"}.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update feature flag.",
      );
    }
  };

  const saveMaintenance = async () => {
    if (!maintenance) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/settings/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(maintenance),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Unable to save maintenance settings.");
      }

      const body = await res.json();
      setMaintenance(body.maintenance);
      setSuccess("Maintenance settings saved.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save maintenance settings.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="Platform Settings"
        subtitle="Global configuration, feature controls, integrations, and operational mode"
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={loadSettings}
          disabled={loading}
        >
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh
        </Button>
      </PageHeader>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Settings unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-emerald-200 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-900">
          <Check className="h-4 w-4" />
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/*
        Platform settings, flags, keys and integrations are all current
        config state — there's no dated history behind any of these
        counts, so no card gets a trend. Active Flags (rollout state) and
        Configured Keys (whether required secrets are actually set, which
        is what turns the icon amber) are the two an admin needs to check
        first and keep the default size; Platform and Connected are
        descriptive context and go "sm".
      */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<ToggleLeft className="h-5 w-5" />}
          label="Active Flags"
          value={loading ? "..." : activeFlags}
          variant="purple"
          delta={`${flags.length} total`}
          deltaType="neutral"
        />
        <KpiCard
          icon={<KeyRound className="h-5 w-5" />}
          label="Configured Keys"
          value={loading ? "..." : configuredKeys}
          variant={configuredKeys > 0 ? "green" : "amber"}
          delta="Secrets masked"
          deltaType="neutral"
        />
        <KpiCard
          icon={<Settings className="h-5 w-5" />}
          label="Platform"
          value={loading ? "..." : settings?.platform_name || "4 Our Life"}
          variant="blue"
          delta={settings?.default_language?.toUpperCase() || "EN"}
          deltaType="neutral"
          size="sm"
        />
        <KpiCard
          icon={<Plug className="h-5 w-5" />}
          label="Connected"
          value={loading ? "..." : connectedIntegrations}
          variant="teal"
          delta={`${integrations.length} integrations`}
          deltaType="neutral"
          size="sm"
        />
      </div>

      <Tabs value={activeTab} onValueChange={changeTab} className="w-full">
        <div className="border-b border-slate-200 dark:border-slate-700">
          <TabsList className="h-auto w-full justify-start gap-0 overflow-x-auto rounded-none bg-transparent p-0">
            {tabList.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="shrink-0 rounded-none border-b-2 border-transparent px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 data-[state=active]:border-emerald-700 dark:data-[state=active]:border-emerald-400 data-[state=active]:bg-transparent data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-none"
              >
                <tab.icon className="mr-2 h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="general" className="mt-5 outline-none">
          <GeneralSettings
            loading={loading}
            saving={saving}
            settings={settings}
            setSettings={setSettings}
            onSave={saveGeneral}
          />
        </TabsContent>
        <TabsContent value="features" className="mt-5 outline-none">
          <FeatureFlags loading={loading} flags={flags} onToggle={toggleFlag} />
        </TabsContent>
        <TabsContent value="security" className="mt-5 outline-none">
          <SecurityTab />
        </TabsContent>
        <TabsContent value="api-keys" className="mt-5 outline-none">
          <ApiKeysTable loading={loading} keys={apiKeys} />
        </TabsContent>
        <TabsContent value="notifications" className="mt-5 outline-none">
          <NotificationsTab />
        </TabsContent>
        <TabsContent value="integrations" className="mt-5 outline-none">
          <IntegrationsList loading={loading} integrations={integrations} />
        </TabsContent>
        <TabsContent value="billing" className="mt-5 outline-none">
          <BillingTab />
        </TabsContent>
        <TabsContent value="compliance" className="mt-5 outline-none">
          <ComplianceTab />
        </TabsContent>
        <TabsContent value="maintenance" className="mt-5 outline-none">
          <MaintenanceSettings
            loading={loading}
            saving={saving}
            maintenance={maintenance}
            setMaintenance={setMaintenance}
            onSave={saveMaintenance}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GeneralSettings({
  loading,
  saving,
  settings,
  setSettings,
  onSave,
}: {
  loading: boolean;
  saving: boolean;
  settings: PlatformSettings | null;
  setSettings: React.Dispatch<React.SetStateAction<PlatformSettings | null>>;
  onSave: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
          General Configuration
        </CardTitle>
        <Button type="button" size="sm" onClick={onSave} disabled={loading || saving || !settings}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </Button>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Platform Name">
          <Input
            value={settings?.platform_name || ""}
            disabled={loading || !settings}
            onChange={(event) =>
              setSettings((current) =>
                current ? { ...current, platform_name: event.target.value } : current,
              )
            }
          />
        </Field>
        <Field label="Support Email">
          <Input
            type="email"
            value={settings?.support_email || ""}
            disabled={loading || !settings}
            onChange={(event) =>
              setSettings((current) =>
                current ? { ...current, support_email: event.target.value } : current,
              )
            }
          />
        </Field>
        <Field label="Support Phone">
          <Input
            value={settings?.support_phone || ""}
            disabled={loading || !settings}
            onChange={(event) =>
              setSettings((current) =>
                current ? { ...current, support_phone: event.target.value } : current,
              )
            }
          />
        </Field>
        <Field label="Support WhatsApp">
          <Input
            placeholder="+233 55 000 0000"
            value={settings?.support_whatsapp || ""}
            disabled={loading || !settings}
            onChange={(event) =>
              setSettings((current) =>
                current ? { ...current, support_whatsapp: event.target.value } : current,
              )
            }
          />
        </Field>
        <Field label="Share App URL">
          <Input
            placeholder="https://4ourlife.com"
            value={settings?.share_url || ""}
            disabled={loading || !settings}
            onChange={(event) =>
              setSettings((current) =>
                current ? { ...current, share_url: event.target.value } : current,
              )
            }
          />
        </Field>
        <Field label="Default Language">
          <select
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm outline-none"
            value={settings?.default_language || "en"}
            disabled={loading || !settings}
            onChange={(event) =>
              setSettings((current) =>
                current
                  ? {
                      ...current,
                      default_language: event.target.value as PlatformSettings["default_language"],
                    }
                  : current,
              )
            }
          >
            <option value="en">English</option>
            <option value="twi">Twi</option>
            <option value="ga">Ga</option>
          </select>
        </Field>
      </CardContent>
    </Card>
  );
}

function FeatureFlags({
  loading,
  flags,
  onToggle,
}: {
  loading: boolean;
  flags: FeatureFlag[];
  onToggle: (flag: FeatureFlag) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
          Feature Flags
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && <EmptyPanel label="Loading feature flags..." />}
        {!loading && flags.length === 0 && (
          <EmptyPanel label="No feature flags configured." />
        )}
        {!loading &&
          flags.map((flag) => (
            <div
              key={flag.id}
              className="flex flex-col gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200">{flag.name}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {flag.description || "No description"}
                </div>
                <div className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                  Rollout {flag.rollout_percentage}%
                </div>
              </div>
              <Switch
                checked={flag.enabled}
                onCheckedChange={() => onToggle(flag)}
                aria-label={`Toggle ${flag.name}`}
              />
            </div>
          ))}
      </CardContent>
    </Card>
  );
}

function ApiKeysTable({
  loading,
  keys,
}: {
  loading: boolean;
  keys: ApiKeyStatus[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
          API Key Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4 border-amber-200 bg-amber-50 dark:bg-amber-500/15 text-amber-900">
          <KeyRound className="h-4 w-4" />
          <AlertTitle>Secrets are masked</AlertTitle>
          <AlertDescription>
            This page shows whether provider keys are configured. It never returns
            raw API secrets to the browser.
          </AlertDescription>
        </Alert>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Environment</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Hint</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <EmptyRow colSpan={6} label="Loading API key status..." />}
            {!loading && keys.length === 0 && (
              <EmptyRow colSpan={6} label="No API key metadata configured." />
            )}
            {!loading &&
              keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-bold text-slate-800 dark:text-slate-200">{key.name}</TableCell>
                  <TableCell>{key.provider}</TableCell>
                  <TableCell>{key.environment}</TableCell>
                  <TableCell><Badge variant="outline">{key.source}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">
                    {key.key_hint || "Not configured"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={key.active ? "emerald" : "amber"}>
                      {key.active ? "Configured" : "Missing"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function IntegrationsList({
  loading,
  integrations,
}: {
  loading: boolean;
  integrations: Integration[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
          Integrations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && <EmptyPanel label="Loading integrations..." />}
        {!loading && integrations.length === 0 && (
          <EmptyPanel label="No integrations configured." />
        )}
        {!loading &&
          integrations.map((integration) => (
            <div
              key={integration.id}
              className="flex flex-col gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200">{integration.name}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {integration.provider}
                  {integration.webhook_url ? ` · ${integration.webhook_url}` : ""}
                </div>
              </div>
              <Badge
                variant={
                  integration.status === "connected"
                    ? "emerald"
                    : integration.status === "error"
                      ? "destructive"
                      : integration.status === "pending"
                        ? "amber"
                        : "secondary"
                }
              >
                {integration.status}
              </Badge>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}

function MaintenanceSettings({
  loading,
  saving,
  maintenance,
  setMaintenance,
  onSave,
}: {
  loading: boolean;
  saving: boolean;
  maintenance: Maintenance | null;
  setMaintenance: React.Dispatch<React.SetStateAction<Maintenance | null>>;
  onSave: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
          Maintenance Mode
        </CardTitle>
        <Button type="button" size="sm" onClick={onSave} disabled={loading || saving || !maintenance}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <div>
            <div className="font-bold text-slate-800 dark:text-slate-200">Enable maintenance mode</div>
            <div className="mt-1 text-xs text-slate-500">
              When enabled, public app surfaces should display the maintenance message.
            </div>
          </div>
          <Switch
            checked={Boolean(maintenance?.enabled)}
            disabled={loading || !maintenance}
            onCheckedChange={(checked) =>
              setMaintenance((current) =>
                current ? { ...current, enabled: checked } : current,
              )
            }
            aria-label="Toggle maintenance mode"
          />
        </div>
        <Field label="Maintenance Message">
          <Textarea
            rows={4}
            value={maintenance?.message || ""}
            disabled={loading || !maintenance}
            onChange={(event) =>
              setMaintenance((current) =>
                current ? { ...current, message: event.target.value } : current,
              )
            }
          />
        </Field>
        <Field label="Allowed Routes">
          <Input
            value={maintenance?.allowedRoutes.join(", ") || ""}
            disabled={loading || !maintenance}
            onChange={(event) =>
              setMaintenance((current) =>
                current
                  ? {
                      ...current,
                      allowedRoutes: event.target.value
                        .split(",")
                        .map((route) => route.trim())
                        .filter(Boolean),
                    }
                  : current,
              )
            }
          />
        </Field>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="block text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function EmptyPanel({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center text-sm font-medium text-slate-400">
      {label}
    </div>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        className="h-32 text-center text-sm font-medium text-slate-400"
      >
        {label}
      </TableCell>
    </TableRow>
  );
}
