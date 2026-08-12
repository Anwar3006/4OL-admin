"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Ambulance,
  Bed,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  FileText,
  Gift,
  MessageSquare,
  RefreshCw,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import KpiCard from "@/components/redesign/KpiCard";
import PageHeader from "@/components/redesign/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type ModuleKind = "bedtracker" | "hcp" | "jobs" | "facilityscout";

type TabConfig = {
  id: string;
  label: string;
};

type Props = {
  module: ModuleKind;
  title: string;
  subtitle: string;
  basePath: string;
  tabs: TabConfig[];
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "emerald" | "amber" | "blue" | "purple"> = {
  active: "emerald",
  approved: "emerald",
  completed: "emerald",
  filled: "emerald",
  published: "emerald",
  rewarded: "emerald",
  verified: "emerald",
  pending: "amber",
  under_review: "amber",
  needs_review: "amber",
  draft: "secondary",
  closed: "secondary",
  expired: "secondary",
  rejected: "destructive",
  critical: "destructive",
  warning: "amber",
  info: "blue",
};

function statusVariant(status?: string | null) {
  return STATUS_VARIANTS[String(status ?? "").toLowerCase()] ?? "secondary";
}

function labelize(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "Not set";
  return String(value).replaceAll("_", " ");
}

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMoney(value?: number | string | null, currency = "GHS") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function profileName(profile: any) {
  const user = Array.isArray(profile) ? profile[0] : profile;
  return [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Unknown";
}

function facilityName(row: any) {
  const facility = Array.isArray(row?.facility_profile)
    ? row.facility_profile[0]
    : row?.facility_profile;
  return facility?.facility_name || "Unassigned facility";
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

function StatusBadge({ value }: { value?: string | null }) {
  return (
    <Badge variant={statusVariant(value)} className="capitalize">
      {labelize(value)}
    </Badge>
  );
}

function ModuleTable({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">{children}</CardContent>
    </Card>
  );
}

export default function OperationsModuleDashboard({
  module,
  title,
  subtitle,
  basePath,
  tabs,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || tabs[0].id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>({});

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) setActiveTab(tabParam);
  }, [tabParam, activeTab]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/${module}`, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Unable to load ${title}.`);
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to load ${title}.`);
    } finally {
      setLoading(false);
    }
  }, [module, title]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(value === tabs[0].id ? basePath : `${basePath}?tab=${value}`, {
      scroll: false,
    });
  };

  const metrics = data.metrics ?? {};
  const kpis = useMemo(() => buildKpis(module, metrics, loading), [module, metrics, loading]);

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader title={title} subtitle={subtitle}>
        <Button type="button" variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh
        </Button>
      </PageHeader>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Module data unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard
            key={kpi.label}
            icon={kpi.icon}
            label={kpi.label}
            value={kpi.value}
            variant={kpi.variant}
            delta={kpi.delta}
            deltaType={kpi.deltaType}
          />
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
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

        <div className="animate-in slide-in-from-bottom-2 duration-300">
          {tabs.map((tab) => (
            <TabsContent key={tab.id} className="w-full min-w-0 outline-none" value={tab.id}>
              {renderTab(module, tab.id, data, loading)}
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}

function buildKpis(module: ModuleKind, metrics: any, loading: boolean) {
  const value = (key: string) => (loading ? "..." : (metrics[key] ?? 0));
  if (module === "bedtracker") {
    return [
      { label: "Tracked Facilities", value: value("trackedFacilities"), icon: <Bed className="h-5 w-5" />, variant: "blue" as const, delta: "Live registry", deltaType: "neutral" as const },
      { label: "Available Beds", value: value("availableBeds"), icon: <CheckCircle2 className="h-5 w-5" />, variant: "green" as const, delta: `${metrics.totalBeds ?? 0} total`, deltaType: "up" as const },
      { label: "Active Alerts", value: value("activeAlerts"), icon: <AlertTriangle className="h-5 w-5" />, variant: "red" as const, delta: "Requires review", deltaType: "down" as const },
      { label: "Dispatches", value: value("activeDispatches"), icon: <Ambulance className="h-5 w-5" />, variant: "amber" as const, delta: "Open runs", deltaType: "neutral" as const },
    ];
  }
  if (module === "hcp") {
    return [
      { label: "HCP Records", value: value("totalHcp"), icon: <ShieldCheck className="h-5 w-5" />, variant: "blue" as const, delta: "Verification table", deltaType: "neutral" as const },
      { label: "Pending", value: value("pending"), icon: <ClipboardList className="h-5 w-5" />, variant: "amber" as const, delta: "Needs decision", deltaType: "neutral" as const },
      { label: "Verified", value: value("verified"), icon: <CheckCircle2 className="h-5 w-5" />, variant: "green" as const, delta: "Trusted access", deltaType: "up" as const },
      { label: "Group Chats", value: value("groupChats"), icon: <MessageSquare className="h-5 w-5" />, variant: "purple" as const, delta: "Professional spaces", deltaType: "neutral" as const },
    ];
  }
  if (module === "jobs") {
    return [
      { label: "Listings", value: value("listings"), icon: <BriefcaseBusiness className="h-5 w-5" />, variant: "blue" as const, delta: "Latest records", deltaType: "neutral" as const },
      { label: "Published", value: value("published"), icon: <CheckCircle2 className="h-5 w-5" />, variant: "green" as const, delta: "Public board", deltaType: "up" as const },
      { label: "Applicants", value: value("applicants"), icon: <Users className="h-5 w-5" />, variant: "purple" as const, delta: `${metrics.pendingApplications ?? 0} pending`, deltaType: "neutral" as const },
      { label: "Premium Plans", value: value("premiumPlans"), icon: <Gift className="h-5 w-5" />, variant: "amber" as const, delta: "Active plans", deltaType: "neutral" as const },
    ];
  }
  return [
    { label: "Submissions", value: value("submissions"), icon: <FileText className="h-5 w-5" />, variant: "blue" as const, delta: "Latest queue", deltaType: "neutral" as const },
    { label: "Pending Review", value: value("pendingReview"), icon: <ClipboardList className="h-5 w-5" />, variant: "amber" as const, delta: "Needs action", deltaType: "neutral" as const },
    { label: "Collectors", value: value("activeCollectors"), icon: <Users className="h-5 w-5" />, variant: "green" as const, delta: "Active field team", deltaType: "up" as const },
    { label: "Reward Liability", value: loading ? "..." : formatMoney(metrics.rewardLiability), icon: <Gift className="h-5 w-5" />, variant: "purple" as const, delta: `${metrics.rewardsDue ?? 0} due`, deltaType: "neutral" as const },
  ];
}

function renderTab(module: ModuleKind, tab: string, data: any, loading: boolean) {
  if (module === "bedtracker") return renderBedTracker(tab, data, loading);
  if (module === "hcp") return renderHcp(tab, data, loading);
  if (module === "jobs") return renderJobs(tab, data, loading);
  return renderFacilityScout(tab, data, loading);
}

function renderBedTracker(tab: string, data: any, loading: boolean) {
  const facilities = data.facilities ?? [];
  const alerts = data.alerts ?? [];
  const dispatches = data.dispatches ?? [];

  if (tab === "dispatch") {
    return (
      <ModuleTable title="Ambulance Dispatch">
        <Table>
          <TableHeader><TableRow><TableHead>Reference</TableHead><TableHead>Emergency</TableHead><TableHead>Pickup</TableHead><TableHead>Destination</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading && <EmptyRow colSpan={6} label="Loading dispatches..." />}
            {!loading && dispatches.length === 0 && <EmptyRow colSpan={6} label="No ambulance dispatches found." />}
            {!loading && dispatches.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell className="font-bold">{item.dispatch_reference}</TableCell>
                <TableCell>{labelize(item.emergency_type)}</TableCell>
                <TableCell>{item.pickup_area || item.pickup_address}</TableCell>
                <TableCell>{facilityName(item) || item.destination_address}</TableCell>
                <TableCell><StatusBadge value={item.priority} /></TableCell>
                <TableCell><StatusBadge value={item.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ModuleTable>
    );
  }

  if (tab === "analytics" || tab === "strategy") {
    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700">Capacity Mix</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <MetricLine label="ICU available" value={facilities.reduce((sum: number, item: any) => sum + Number(item.icu_available ?? 0), 0)} />
            <MetricLine label="General ward available" value={facilities.reduce((sum: number, item: any) => sum + Number(item.general_ward_available ?? 0), 0)} />
            <MetricLine label="Maternity available" value={facilities.reduce((sum: number, item: any) => sum + Number(item.maternity_available ?? 0), 0)} />
            <MetricLine label="Pediatric available" value={facilities.reduce((sum: number, item: any) => sum + Number(item.pediatric_available ?? 0), 0)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700">Operational Design</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <MetricLine label="Auto-alert enabled facilities" value={facilities.filter((item: any) => item.auto_alert_enabled).length} />
            <MetricLine label="Tracking disabled" value={facilities.filter((item: any) => !item.is_tracking_enabled).length} />
            <MetricLine label="Unresolved warnings" value={alerts.filter((item: any) => !item.is_resolved && item.severity === "warning").length} />
            <MetricLine label="Unresolved critical alerts" value={alerts.filter((item: any) => !item.is_resolved && item.severity === "critical").length} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tab === "registry" || tab === "facilities" || tab === "overview") {
    return (
      <ModuleTable title={tab === "overview" ? "Live Facility Bed Overview" : "Bed Registry"}>
        <Table>
          <TableHeader><TableRow><TableHead>Facility</TableHead><TableHead>Available</TableHead><TableHead>Occupied</TableHead><TableHead>ICU</TableHead><TableHead>Emergency</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading && <EmptyRow colSpan={6} label="Loading tracked facilities..." />}
            {!loading && facilities.length === 0 && <EmptyRow colSpan={6} label="No tracked facilities found." />}
            {!loading && facilities.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell><div className="font-bold">{facilityName(item)}</div><div className="text-xs text-slate-500">{labelize(item.facility_profile?.area)} · {labelize(item.facility_profile?.region)}</div></TableCell>
                <TableCell className="font-black text-emerald-700">{item.available_beds}/{item.total_beds}</TableCell>
                <TableCell>{item.occupied_beds}</TableCell>
                <TableCell>{item.icu_available}/{item.icu_beds}</TableCell>
                <TableCell>{item.emergency_beds}</TableCell>
                <TableCell>{formatDate(item.last_updated_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ModuleTable>
    );
  }

  return (
    <ModuleTable title="BedTracker Alerts">
      <Table>
        <TableHeader><TableRow><TableHead>Severity</TableHead><TableHead>Alert</TableHead><TableHead>Bed Type</TableHead><TableHead>Availability</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
        <TableBody>
          {loading && <EmptyRow colSpan={6} label="Loading alerts..." />}
          {!loading && alerts.length === 0 && <EmptyRow colSpan={6} label="No bed alerts found." />}
          {!loading && alerts.map((item: any) => (
            <TableRow key={item.id}>
              <TableCell><StatusBadge value={item.severity} /></TableCell>
              <TableCell><div className="font-bold">{labelize(item.alert_type)}</div><div className="text-xs text-slate-500">{item.message}</div></TableCell>
              <TableCell>{labelize(item.bed_type)}</TableCell>
              <TableCell>{item.beds_available ?? 0}/{item.beds_total ?? 0}</TableCell>
              <TableCell><StatusBadge value={item.is_resolved ? "resolved" : "active"} /></TableCell>
              <TableCell>{formatDate(item.created_at)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ModuleTable>
  );
}

function renderHcp(tab: string, data: any, loading: boolean) {
  const verifications = data.verifications ?? [];
  const chats = data.groupChats ?? [];
  const rows = tab === "pending"
    ? verifications.filter((item: any) => ["pending", "under_review"].includes(String(item.verification_status)))
    : verifications;

  if (tab === "chats") {
    return (
      <ModuleTable title="Professional Group Chats">
        <Table>
          <TableHeader><TableRow><TableHead>Chat</TableHead><TableHead>Category</TableHead><TableHead>Verified Only</TableHead><TableHead>Flagged</TableHead><TableHead>Last Activity</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading && <EmptyRow colSpan={5} label="Loading HCP group chats..." />}
            {!loading && chats.length === 0 && <EmptyRow colSpan={5} label="No HCP group chats found." />}
            {!loading && chats.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell><div className="font-bold">{item.group_name || item.name || "Unnamed group"}</div><div className="text-xs text-slate-500">{item.flagged_reason || "No moderation flags"}</div></TableCell>
                <TableCell>{labelize(item.group_category)}</TableCell>
                <TableCell><StatusBadge value={item.is_verified_only ? "verified" : "open"} /></TableCell>
                <TableCell><StatusBadge value={item.is_flagged ? "warning" : "clear"} /></TableCell>
                <TableCell>{formatDate(item.last_message_at || item.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ModuleTable>
    );
  }

  return (
    <ModuleTable title={tab === "pending" ? "Pending HCP Verification" : "HCP Registry"}>
      <Table>
        <TableHeader><TableRow><TableHead>Professional</TableHead><TableHead>License</TableHead><TableHead>Specialty</TableHead><TableHead>Expiry</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
        <TableBody>
          {loading && <EmptyRow colSpan={6} label="Loading HCP records..." />}
          {!loading && rows.length === 0 && <EmptyRow colSpan={6} label="No HCP records found." />}
          {!loading && rows.map((item: any) => (
            <TableRow key={item.id}>
              <TableCell><div className="font-bold">{profileName(item.user_profiles)}</div><div className="text-xs text-slate-500">{item.user_profiles?.phone_number || "No phone"}</div></TableCell>
              <TableCell><div>{item.license_number}</div><div className="text-xs text-slate-500">{item.issuing_body}</div></TableCell>
              <TableCell>{item.specialty || labelize(item.license_type)}</TableCell>
              <TableCell>{item.license_expiry || "Not set"}</TableCell>
              <TableCell><StatusBadge value={item.verification_status} /></TableCell>
              <TableCell>{formatDate(item.created_at)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ModuleTable>
  );
}

function renderJobs(tab: string, data: any, loading: boolean) {
  const postings = data.postings ?? [];
  const applications = data.applications ?? [];
  const plans = data.plans ?? [];

  if (tab === "applicants" || tab === "cv") {
    return (
      <ModuleTable title={tab === "cv" ? "Digital CV Review" : "Applicants"}>
        <Table>
          <TableHeader><TableRow><TableHead>Applicant</TableHead><TableHead>Job</TableHead><TableHead>Resume</TableHead><TableHead>Status</TableHead><TableHead>Applied</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading && <EmptyRow colSpan={5} label="Loading applications..." />}
            {!loading && applications.length === 0 && <EmptyRow colSpan={5} label="No job applications found." />}
            {!loading && applications.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell><div className="font-bold">{profileName(item.user_profiles)}</div><div className="text-xs text-slate-500">{item.user_profiles?.phone_number || "No phone"}</div></TableCell>
                <TableCell>{item.job_postings?.title || "Unknown job"}</TableCell>
                <TableCell>{item.resume_url ? "Resume attached" : "No resume"}</TableCell>
                <TableCell><StatusBadge value={item.status} /></TableCell>
                <TableCell>{formatDate(item.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ModuleTable>
    );
  }

  if (tab === "premium") {
    return (
      <ModuleTable title="Premium Job Services">
        <Table>
          <TableHeader><TableRow><TableHead>Plan</TableHead><TableHead>Tier</TableHead><TableHead>Monthly</TableHead><TableHead>Yearly</TableHead><TableHead>Max Listings</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading && <EmptyRow colSpan={6} label="Loading premium plans..." />}
            {!loading && plans.length === 0 && <EmptyRow colSpan={6} label="No premium plans found." />}
            {!loading && plans.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell className="font-bold">{item.name}</TableCell>
                <TableCell>{labelize(item.tier)}</TableCell>
                <TableCell>{formatMoney(item.price_monthly, item.currency)}</TableCell>
                <TableCell>{formatMoney(item.price_yearly, item.currency)}</TableCell>
                <TableCell>{item.max_listings ?? "Unlimited"}</TableCell>
                <TableCell><StatusBadge value={item.is_active ? "active" : "inactive"} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ModuleTable>
    );
  }

  return (
    <ModuleTable title={tab === "post" ? "Job Posting Pipeline" : "All Job Listings"}>
      <Table>
        <TableHeader><TableRow><TableHead>Listing</TableHead><TableHead>Facility</TableHead><TableHead>Type</TableHead><TableHead>Salary</TableHead><TableHead>Applications</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>
          {loading && <EmptyRow colSpan={6} label="Loading job listings..." />}
          {!loading && postings.length === 0 && <EmptyRow colSpan={6} label="No job listings found." />}
          {!loading && postings.map((item: any) => (
            <TableRow key={item.id}>
              <TableCell><div className="font-bold">{item.title}</div><div className="text-xs text-slate-500">{item.specialty || labelize(item.experience_level)}</div></TableCell>
              <TableCell>{facilityName(item)}</TableCell>
              <TableCell>{labelize(item.job_type)}</TableCell>
              <TableCell>{formatMoney(item.salary_min, item.salary_currency)} - {formatMoney(item.salary_max, item.salary_currency)}</TableCell>
              <TableCell>{item.application_count ?? 0}</TableCell>
              <TableCell><StatusBadge value={item.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ModuleTable>
  );
}

function renderFacilityScout(tab: string, data: any, loading: boolean) {
  const submissions = data.submissions ?? [];
  const collectors = data.collectors ?? [];
  const referrals = data.referrals ?? [];
  const pending = submissions.filter((item: any) => ["pending", "needs_review"].includes(String(item.status)));

  if (tab === "leaderboard") {
    return (
      <ModuleTable title="Collector Leaderboard">
        <Table>
          <TableHeader><TableRow><TableHead>Collector</TableHead><TableHead>Employee ID</TableHead><TableHead>Total</TableHead><TableHead>Approved</TableHead><TableHead>Rejected</TableHead><TableHead>Last Active</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading && <EmptyRow colSpan={6} label="Loading collectors..." />}
            {!loading && collectors.length === 0 && <EmptyRow colSpan={6} label="No collectors found." />}
            {!loading && collectors.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell><div className="font-bold">{profileName(item.user_profiles)}</div><div className="text-xs text-slate-500">{item.user_profiles?.phone_number || "No phone"}</div></TableCell>
                <TableCell>{item.employee_id}</TableCell>
                <TableCell>{item.total_submissions ?? 0}</TableCell>
                <TableCell>{item.approved_submissions ?? 0}</TableCell>
                <TableCell>{item.rejected_submissions ?? 0}</TableCell>
                <TableCell>{formatDate(item.last_active_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ModuleTable>
    );
  }

  if (tab === "rewards") {
    return (
      <ModuleTable title="Rewards Queue">
        <Table>
          <TableHeader><TableRow><TableHead>Referral</TableHead><TableHead>Facility</TableHead><TableHead>Reward</TableHead><TableHead>Paid</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading && <EmptyRow colSpan={6} label="Loading rewards..." />}
            {!loading && referrals.length === 0 && <EmptyRow colSpan={6} label="No rewards found." />}
            {!loading && referrals.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell>{labelize(item.referral_type)}</TableCell>
                <TableCell>{facilityName(item)}</TableCell>
                <TableCell>{formatMoney(item.reward_amount)}</TableCell>
                <TableCell><StatusBadge value={item.reward_paid ? "completed" : "pending"} /></TableCell>
                <TableCell><StatusBadge value={item.status} /></TableCell>
                <TableCell>{formatDate(item.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ModuleTable>
    );
  }

  if (tab === "settings") {
    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-700"><Settings className="h-4 w-4" /> Queue Policy</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <MetricLine label="Pending submissions" value={pending.length} />
            <MetricLine label="Photo-backed submissions" value={submissions.filter((item: any) => (item.photos ?? []).length > 0).length} />
            <MetricLine label="Unpaid referrals" value={referrals.filter((item: any) => !item.reward_paid).length} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-700"><Activity className="h-4 w-4" /> Field Coverage</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <MetricLine label="Active collectors" value={collectors.filter((item: any) => item.is_active).length} />
            <MetricLine label="Inactive collectors" value={collectors.filter((item: any) => !item.is_active).length} />
            <MetricLine label="Submissions reviewed" value={submissions.filter((item: any) => item.reviewed_at).length} />
          </CardContent>
        </Card>
      </div>
    );
  }

  const rows = tab === "pending" ? pending : submissions;
  return (
    <ModuleTable title={tab === "pending" ? "Pending Review" : "All Submissions"}>
      <Table>
        <TableHeader><TableRow><TableHead>Submission</TableHead><TableHead>Collector</TableHead><TableHead>Facility</TableHead><TableHead>Photos</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
        <TableBody>
          {loading && <EmptyRow colSpan={6} label="Loading submissions..." />}
          {!loading && rows.length === 0 && <EmptyRow colSpan={6} label="No FacilityScout submissions found." />}
          {!loading && rows.map((item: any) => (
            <TableRow key={item.id}>
              <TableCell><div className="font-bold">{labelize(item.submission_type)}</div><div className="text-xs text-slate-500">{item.gps_location || "No GPS"}</div></TableCell>
              <TableCell>{profileName(item.data_collectors?.user_profiles)}<div className="text-xs text-slate-500">{item.data_collectors?.employee_id}</div></TableCell>
              <TableCell>{facilityName(item)}</TableCell>
              <TableCell>{(item.photos ?? []).length}</TableCell>
              <TableCell><StatusBadge value={item.status} /></TableCell>
              <TableCell>{formatDate(item.created_at)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ModuleTable>
  );
}

function MetricLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <span>{label}</span>
      <span className="font-black text-slate-800">{value}</span>
    </div>
  );
}
