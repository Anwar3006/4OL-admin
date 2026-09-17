"use client";

import Link from "next/link";
import { Activity, AlertTriangle, Settings2, Smartphone, UsersRound, Watch } from "lucide-react";
import KpiCard from "@/components/redesign/KpiCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFitnessHealthSyncStats } from "@/features/fitness/data/useFitnessAnalytics";

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "Never";

export default function HealthTab() {
  const { data, isLoading, isError } = useFitnessHealthSyncStats();
  const platforms = data?.platforms ?? [];
  const failures = data?.recent_failures ?? [];
  const connectedUsers = platforms.reduce((sum, platform) => sum + Number(platform.connected_users || 0), 0);
  const syncedToday = platforms.reduce((sum, platform) => sum + Number(platform.synced_today || 0), 0);
  const enabledCount = platforms.filter((platform) => platform.is_enabled).length;
  const totalFailures = platforms.reduce((sum, platform) => sum + Number(platform.sync_failures || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/*
        No trend chart here: the backing RPC caps recent_failures at the
        last 20 rows (not a time window — supabase/migrations/20260821_
        fitness_extension.sql), so day-bucketing it could show a flat
        history for a slow platform and a misleadingly spiky one for a
        busy one. Reach (Connected Users) and risk (Failed Syncs) still
        lead at "default" size; the rest are "sm" — a bare number doesn't
        need the room a chart would.
      */}
      <div className="grid grid-cols-2 gap-4">
        <KpiCard
          icon={<UsersRound className="size-4" />}
          label="Connected Users"
          value={isLoading ? "..." : connectedUsers}
          delta="Across all wearable platforms"
          deltaType="neutral"
          variant="green"
        />
        <KpiCard
          icon={<AlertTriangle className="size-4" />}
          label="Failed Syncs"
          value={isLoading ? "..." : totalFailures}
          delta={!isLoading && totalFailures > 0 ? "Needs review" : "All clear"}
          deltaType={!isLoading && totalFailures > 0 ? "down" : "up"}
          variant={!isLoading && totalFailures > 0 ? "red" : "green"}
        />
        <KpiCard
          icon={<Activity className="size-4" />}
          label="Synced Today"
          value={isLoading ? "..." : syncedToday}
          variant="blue"
          size="sm"
        />
        <KpiCard
          icon={<Watch className="size-4" />}
          label="Active Wearables"
          value={isLoading ? "..." : `${enabledCount}/${platforms.length}`}
          delta="platforms enabled"
          deltaType="neutral"
          variant="purple"
          size="sm"
        />
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-black">Connected Platforms</CardTitle>
            <p className="mt-1 text-xs font-medium text-slate-500">Wearables and health services sending member fitness activity.</p>
          </div>
          <Link href="/settings?tab=integrations">
            <Button size="sm" variant="outline"><Settings2 className="size-4" /> Platform settings</Button>
          </Link>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>{["Platform", "Users", "Status", "Last Sync", "Data Types", "Actions"].map((heading) => <th key={heading} className="px-6 py-3 text-3xs font-black uppercase tracking-widest text-slate-400">{heading}</th>)}</tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">Loading health integrations…</td></tr>}
              {!isLoading && isError && <tr><td colSpan={6} className="py-12 text-center text-sm font-medium text-red-600">Health integrations could not be loaded.</td></tr>}
              {!isLoading && !isError && platforms.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">No health platforms have been registered.</td></tr>}
              {platforms.map((platform) => (
                <tr key={platform.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15"><Smartphone className="size-4" /></div><div><p className="text-sm font-black text-slate-800 dark:text-slate-100">{platform.platform_name}</p><p className="text-2xs text-slate-400">Every {platform.sync_frequency_mins ?? 60} min</p></div></div></td>
                  <td className="px-6 py-4 text-sm font-black tabular-nums">{Number(platform.connected_users || 0).toLocaleString()}</td>
                  <td className="px-6 py-4"><span className={`rounded-full px-2.5 py-1 text-3xs font-black uppercase tracking-wider ${platform.is_enabled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-700"}`}>{platform.is_enabled ? "Connected" : "Disabled"}</span></td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-500">{formatDate(platform.last_sync_at)}</td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-600 dark:text-slate-300">{platform.data_types?.length ? platform.data_types.join(", ") : "Not declared"}</td>
                  <td className="px-6 py-4"><Link href="/settings?tab=integrations" className="text-xs font-black text-blue-600 hover:underline">Configure</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
        <Card>
          <CardHeader><CardTitle className="text-lg font-black">Sync Health</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {platforms.length === 0 ? <p className="text-sm text-slate-400">No platform sync data yet.</p> : platforms.map((platform) => {
              const success = Number(platform.sync_success || 0);
              const failed = Number(platform.sync_failures || 0);
              const rate = success + failed ? Math.round((success / (success + failed)) * 100) : 0;
              return <div key={platform.id}><div className="mb-1.5 flex justify-between text-xs font-bold"><span>{platform.platform_name}</span><span className="tabular-nums text-slate-500">{rate}% successful</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${rate}%` }} /></div></div>;
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg font-black">Platform Rules</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm font-medium text-slate-600 dark:text-slate-300">
            <p>Only enabled platforms are treated as active integrations.</p>
            <p>Member-level health data remains protected; this page shows operational counts and failures.</p>
            <p>Configuration changes are handled in Settings → Integrations.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader><CardTitle className="text-lg font-black">Recent Sync Failures</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[820px] text-left">
            <thead className="bg-slate-50 dark:bg-slate-900"><tr>{["User", "Platform", "Error", "Failed At", "Retries", "Action"].map((heading) => <th key={heading} className="px-6 py-3 text-3xs font-black uppercase tracking-widest text-slate-400">{heading}</th>)}</tr></thead>
            <tbody>
              {!isLoading && failures.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">No recent sync failures.</td></tr>}
              {failures.map((failure, index) => <tr key={`${failure.synced_at}-${index}`} className="border-t border-slate-100 dark:border-slate-800"><td className="px-6 py-4 text-xs font-bold">{failure.user_name || "Unknown user"}</td><td className="px-6 py-4 text-xs">{failure.platform_name || "—"}</td><td className="max-w-[320px] truncate px-6 py-4 text-xs text-slate-500" title={failure.error_details ?? undefined}>{failure.error_details || "No error details recorded"}</td><td className="px-6 py-4 text-xs text-slate-500">{formatDate(failure.synced_at)}</td><td className="px-6 py-4 text-xs font-black tabular-nums">{failure.retry_count}</td><td className="px-6 py-4"><Link href="/settings?tab=integrations" className="text-xs font-black text-blue-600 hover:underline">Review</Link></td></tr>)}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs font-medium text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">🔒 Health sync information is sensitive personal data. This admin view reports connection health and failures; it does not expose members’ raw health measurements.</div>
    </div>
  );
}
