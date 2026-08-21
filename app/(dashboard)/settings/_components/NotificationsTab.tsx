"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bell } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Template = {
  id: string;
  name: string;
  template_type: string;
  subject: string | null;
  source_module: string | null;
  usage_count: number | null;
  is_active: boolean | null;
};

type AutomationRule = {
  id: string;
  name: string;
  trigger_event: string;
  source_module: string | null;
  channel: string[] | null;
  fire_count: number | null;
  is_active: boolean | null;
};

/**
 * Settings → Notifications tab (Gap Analysis Part P, P7). Read-only overview
 * of the platform's notification templates and automation trigger rules; all
 * editing lives in the dedicated Notifications workspace.
 */
export default function NotificationsTab() {
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (res.status === 403) {
        setDenied(true);
        return;
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to load notification data.");
      setTemplates(json.templates ?? []);
      setRules(json.rules ?? []);
    } catch {
      setTemplates([]);
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (denied) {
    return (
      <Alert className="border-amber-200 bg-amber-50 text-amber-900">
        <Bell className="h-4 w-4" />
        <AlertTitle>Restricted</AlertTitle>
        <AlertDescription>You need the notifications.view permission to see this tab.</AlertDescription>
      </Alert>
    );
  }

  const manageLink = (
    <Link
      href="/notifications"
      className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline"
    >
      Manage in Notifications <ArrowRight className="size-3" />
    </Link>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Message templates ({templates.length})
          </CardTitle>
          {manageLink}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Module</TableHead>
                <TableHead className="text-right">Uses</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-slate-400">
                    Loading templates...
                  </TableCell>
                </TableRow>
              ) : templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-slate-400">
                    No notification templates yet.
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div className="font-medium text-slate-800 dark:text-slate-100">{template.name}</div>
                      {template.subject && (
                        <div className="text-xs text-slate-400">{template.subject}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{template.template_type}</Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 dark:text-slate-400">
                      {template.source_module ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{template.usage_count ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant={template.is_active ? "emerald" : "secondary"}>
                        {template.is_active ? "Active" : "Inactive"}
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
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Automation trigger rules ({rules.length})
          </CardTitle>
          {manageLink}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule</TableHead>
                <TableHead>Trigger event</TableHead>
                <TableHead>Channels</TableHead>
                <TableHead className="text-right">Fires</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-slate-400">
                    Loading automation rules...
                  </TableCell>
                </TableRow>
              ) : rules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-slate-400">
                    No automation rules configured.
                  </TableCell>
                </TableRow>
              ) : (
                rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <div className="font-medium text-slate-800 dark:text-slate-100">{rule.name}</div>
                      {rule.source_module && (
                        <div className="text-xs text-slate-400">{rule.source_module}</div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{rule.trigger_event}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(rule.channel ?? []).map((channel) => (
                          <Badge key={channel} variant="outline" className="text-[10px]">
                            {channel}
                          </Badge>
                        ))}
                        {(rule.channel ?? []).length === 0 && "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{rule.fire_count ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant={rule.is_active ? "emerald" : "secondary"}>
                        {rule.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
