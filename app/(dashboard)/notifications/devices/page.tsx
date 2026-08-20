"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Apple, RefreshCw, Smartphone, Tablet, Users } from "lucide-react";
import { toast } from "sonner";

import {
  getDeviceAnalytics,
  type DeviceAnalytics,
} from "@/actions/user.actions";
import { DistributionDonutChart } from "@/components/charts/DistributionDonutChart";
import { CHART_SERIES_COLORS } from "@/components/charts/palette";
import KpiCard from "@/components/redesign/KpiCard";
import PageHeader from "@/components/redesign/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Reads public.user_push_tokens, the per-device registry added when push
// notifications moved off the single user_profiles.expo_push_token column.
// One row per device per user, so it doubles as the only real picture of what
// hardware the user base runs on.

const PLATFORM_LABELS: Record<string, string> = {
  ios: "iOS",
  android: "Android",
  unknown: "Unknown",
};

// Fixed per platform rather than positional, so iOS doesn't change colour when
// Android overtakes it in the sort order. Tokens come from the shared palette
// (components/charts/palette.ts) so these stay in step with every other chart.
const PLATFORM_COLORS: Record<string, string> = {
  ios: CHART_SERIES_COLORS[0],
  android: CHART_SERIES_COLORS[1],
  unknown: CHART_SERIES_COLORS[4],
};

function platformLabel(platform: string) {
  return PLATFORM_LABELS[platform] ?? platform;
}

function PlatformIcon({ platform }: { platform: string }) {
  if (platform === "ios") return <Apple className="h-4 w-4" />;
  if (platform === "android") return <Smartphone className="h-4 w-4" />;
  return <Tablet className="h-4 w-4" />;
}

export default function DeviceAnalyticsPage() {
  const [data, setData] = useState<DeviceAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    const { data: result, error } = await getDeviceAnalytics();
    if (error) {
      setIsError(true);
      toast.error(error);
    } else {
      setData(result);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const platformSlices = useMemo(
    () =>
      (data?.by_platform ?? []).map((p) => ({
        key: p.platform,
        label: platformLabel(p.platform),
        value: p.devices,
        color: PLATFORM_COLORS[p.platform],
      })),
    [data],
  );

  // Grouped so each platform's models sit under their own heading, which is
  // what makes "precise devices under each category" readable once there are
  // more than a handful of models.
  const modelsByPlatform = useMemo(() => {
    const groups = new Map<string, DeviceAnalytics["by_model"]>();
    for (const m of data?.by_model ?? []) {
      const list = groups.get(m.platform) ?? [];
      list.push(m);
      groups.set(m.platform, list);
    }
    return [...groups.entries()].sort(
      (a, b) =>
        b[1].reduce((s, m) => s + m.devices, 0) -
        a[1].reduce((s, m) => s + m.devices, 0),
    );
  }, [data]);

  const avgDevicesPerUser =
    data && data.total_users > 0
      ? (data.total_devices / data.total_users).toFixed(2)
      : "—";

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Devices"
        subtitle="Registered push devices across the user base, from user_push_tokens"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        <KpiCard
          icon={<Smartphone className="h-5 w-5" />}
          label="Total devices"
          value={data?.total_devices ?? 0}
          isLoading={isLoading}
          isError={isError}
          variant="blue"
        />
        <KpiCard
          icon={<Users className="h-5 w-5" />}
          label="Users with a device"
          value={data?.total_users ?? 0}
          isLoading={isLoading}
          isError={isError}
          variant="teal"
        />
        <KpiCard
          icon={<Smartphone className="h-5 w-5" />}
          label="Multi-device users"
          value={data?.multi_device_users ?? 0}
          delta={`avg ${avgDevicesPerUser} per user`}
          deltaType="neutral"
          isLoading={isLoading}
          isError={isError}
          variant="purple"
        />
        <KpiCard
          icon={<RefreshCw className="h-5 w-5" />}
          label="Active in 30 days"
          value={data?.active_30d ?? 0}
          isLoading={isLoading}
          isError={isError}
          variant="green"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mb-5">
        <DistributionDonutChart
          className="lg:col-span-1"
          title="Platform split"
          description="Registered devices by OS"
          data={platformSlices}
          centerLabel="devices"
        />

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Devices per user</CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.devices_per_user ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No registered devices yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Devices</TableHead>
                    <TableHead className="text-right">Users</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.devices_per_user ?? []).map((row) => (
                    <TableRow key={row.device_count}>
                      <TableCell>
                        {row.device_count}{" "}
                        {row.device_count === 1 ? "device" : "devices"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {row.users}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {modelsByPlatform.map(([platform, models]) => (
          <Card key={platform}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlatformIcon platform={platform} />
                {platformLabel(platform)}
                <Badge variant="secondary" className="ml-auto">
                  {models.reduce((s, m) => s + m.devices, 0)} devices
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Devices</TableHead>
                    <TableHead className="text-right">Users</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.map((m) => (
                    <TableRow key={`${m.platform}-${m.device_name}`}>
                      <TableCell className="font-medium">
                        {m.device_name}
                      </TableCell>
                      <TableCell className="text-right">{m.devices}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {m.users}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
        {!isLoading && modelsByPlatform.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No registered devices yet.
          </p>
        )}
      </div>
    </div>
  );
}
