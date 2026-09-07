"use client";

/**
 * Healthcare Professionals registry (Gap Analysis Part J, J-Phase 4).
 * Replaces the OperationsModuleDashboard shell: 7 tabs (profession tabs are
 * filtered views over one registry, J-D1), licence-verification queue,
 * onboarding dialog, bulk actions and group-chat cards deep-linking to Chats.
 */

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import PageHeader from "@/components/redesign/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import KpiCard from "@/components/redesign/KpiCard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  PROFESSION_GROUPS,
  PROFESSION_TYPES,
  REGULATORY_BODIES,
  downloadHcpCsv,
  hcpDisplayId,
  useEditHcp,
  useHcpBulk,
  useHcpList,
  useVerifyHcp,
  type HcpRow,
} from "@/features/hcp/data/useHcpApi";
import { GHANA_REGIONS_ENUM } from "@/types/formInput";
import OnboardHcpDialog from "./onboard-hcp-dialog";

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-100",
  under_review: "bg-sky-50 text-sky-700 border-sky-100",
  verified: "bg-emerald-50 text-emerald-700 border-emerald-100",
  rejected: "bg-red-50 text-red-600 border-red-100",
  expired: "bg-slate-100 text-slate-500 border-slate-200",
};

const TAB_ALERTS: Record<string, string> = {
  pending:
    "🔍 Licence verification: check claimed licence numbers against the MDC / PCG / NMC / AHPC / GPC portals before approving (J-D7 — manual check).",
  doctors:
    "👨‍⚕️ Doctors are regulated by the Medical & Dental Council (MDC). Licence format: MDC/YYYY/NNNN.",
  nurses:
    "👩‍⚕️ Nurses & Midwives are regulated by the Nursing & Midwifery Council (NMC).",
  pharmacists:
    "💊 Pharmacists & Pharmacy Technicians are regulated by the Pharmacy Council (PCG).",
  allied:
    "🩺 Allied Health professions are regulated by the Allied Health Professions Council (AHPC); GPC covers complementary practice.",
};

const HCPPage = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const activeTab = searchParams.get("tab") || "all";
  const search = searchParams.get("search") || "";
  const bodyFilter = searchParams.get("body") || "all";
  const statusFilter = searchParams.get("hstatus") || "all";
  const regionFilter = searchParams.get("region") || "all";

  const [onboardOpen, setOnboardOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const profession = useMemo(() => {
    const group = PROFESSION_GROUPS[activeTab];
    return group ? group.join(",") : undefined;
  }, [activeTab]);

  const { data, isLoading, isFetching } = useHcpList({
    limit: 50,
    search: search || undefined,
    profession,
    issuing_body: bodyFilter === "all" ? undefined : bodyFilter,
    status:
      activeTab === "pending"
        ? "pending"
        : statusFilter === "all"
          ? undefined
          : statusFilter,
    region: regionFilter === "all" ? undefined : regionFilter,
  });

  const verifyHcp = useVerifyHcp();
  const editHcp = useEditHcp();
  const bulkAction = useHcpBulk();

  const rows = useMemo(() => data?.verifications ?? [], [data]);
  const metrics = data?.metrics;
  const doctorsCount = useMemo(
    () => rows.filter((row) => row.profession_type === "doctor").length,
    [rows],
  );

  const updateParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== "all") params.set(key, value);
      else params.delete(key);
    });
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleExport = async () => {
    try {
      await downloadHcpCsv();
      toast.success("HCP registry exported");
    } catch (error: any) {
      toast.error(error?.message ?? "Export failed");
    }
  };

  const toggleSelect = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );

  const selectClass =
    "h-9 px-3 rounded-xl border border-slate-200 text-2xs font-black uppercase tracking-widest bg-white outline-none";

  const registryTable = (
    <div className="space-y-4">
      {TAB_ALERTS[activeTab] && (
        <div className="bg-sky-50 border border-sky-200 rounded-2xl px-4 py-3 text-xs font-bold text-sky-800">
          {TAB_ALERTS[activeTab]}
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="flex-1 min-w-[220px] h-9 px-4 rounded-xl border border-slate-200 text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-emerald-500/20 outline-none"
          placeholder="🔍 Search name, licence no, specialty..."
          value={search}
          onChange={(e) => updateParams({ search: e.target.value })}
        />
        <select
          className={selectClass}
          value={bodyFilter}
          onChange={(e) => updateParams({ body: e.target.value })}
        >
          <option value="all">All Bodies</option>
          {REGULATORY_BODIES.map((body) => (
            <option key={body} value={body}>
              {body}
            </option>
          ))}
        </select>
        {activeTab !== "pending" && (
          <select
            className={selectClass}
            value={statusFilter}
            onChange={(e) => updateParams({ hstatus: e.target.value })}
          >
            <option value="all">All Statuses</option>
            {["pending", "under_review", "verified", "rejected", "expired"].map(
              (status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, " ")}
                </option>
              ),
            )}
          </select>
        )}
        <select
          className={selectClass}
          value={regionFilter}
          onChange={(e) => updateParams({ region: e.target.value })}
        >
          <option value="all">All Regions</option>
          {GHANA_REGIONS_ENUM.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
      </div>

      {selected.length > 0 && (
        <div className="flex items-center gap-3 bg-slate-900 text-white rounded-2xl px-5 py-3">
          <span className="text-2xs font-black uppercase tracking-widest">
            {selected.length} selected
          </span>
          <button
            className="text-2xs font-black uppercase tracking-widest bg-emerald-500 rounded-lg px-3 py-1.5 disabled:opacity-40"
            disabled={bulkAction.isPending}
            onClick={() => {
              bulkAction.mutate({ ids: selected, action: "approve" });
              setSelected([]);
            }}
          >
            ✅ Approve Selected
          </button>
          <button
            className="text-2xs font-black uppercase tracking-widest bg-red-500 rounded-lg px-3 py-1.5 disabled:opacity-40"
            disabled={bulkAction.isPending}
            onClick={() => {
              bulkAction.mutate({ ids: selected, action: "suspend" });
              setSelected([]);
            }}
          >
            ⏸ Suspend Selected
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left min-w-[900px]">
          <thead>
            <tr className="text-3xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
              <th className="px-4 py-3 w-8" />
              <th className="px-3 py-3">Professional</th>
              <th className="px-3 py-3">Profession / Specialty</th>
              <th className="px-3 py-3">Regulatory Body</th>
              <th className="px-3 py-3">License No.</th>
              <th className="px-3 py-3">Facility</th>
              <th className="px-3 py-3">Region</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Joined</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading || isFetching ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-xs font-bold text-slate-400">
                  Loading registry...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-xs font-bold text-slate-400">
                  No healthcare professionals match the current filters.
                </td>
              </tr>
            ) : (
              rows.map((row: HcpRow) => (
                <tr key={row.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(row.id)}
                      onChange={() => toggleSelect(row.id)}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-sm font-black text-slate-800">
                      {row.user_profiles?.first_name} {row.user_profiles?.last_name}
                    </p>
                    <span className="text-3xs font-black uppercase tracking-widest text-slate-400 bg-slate-100 rounded px-1.5 py-0.5 font-mono">
                      {hcpDisplayId(row.user_id)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-xs font-bold text-slate-700 capitalize">
                      {(row.profession_type ?? row.license_type)?.replace(/_/g, " ")}
                    </p>
                    <p className="text-2xs font-bold text-slate-400">
                      {row.specialty ?? "—"}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-3xs font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full px-2.5 py-1">
                      {row.issuing_body}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs font-mono font-bold text-slate-600">
                    {row.license_number}
                  </td>
                  <td className="px-3 py-3 text-xs font-bold text-slate-600">
                    {row.facility_profile?.facility_name ??
                      row.affiliated_facility_name ??
                      "—"}
                  </td>
                  <td className="px-3 py-3 text-2xs font-bold uppercase text-slate-500">
                    {row.region ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "text-3xs font-black uppercase tracking-widest rounded-full px-2.5 py-1 border",
                        STATUS_BADGE[row.verification_status] ??
                          STATUS_BADGE.expired,
                      )}
                    >
                      {row.verification_status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-2xs font-bold text-slate-500">
                    {row.created_at
                      ? new Date(row.created_at).toLocaleDateString("en-GB")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {(row.verification_status === "pending" ||
                      row.verification_status === "under_review") && (
                      <>
                        <button
                          className="btn btn-primary btn-sm text-white mr-1"
                          disabled={verifyHcp.isPending}
                          onClick={() =>
                            verifyHcp.mutate({ id: row.id, decision: "approved" })
                          }
                        >
                          ✅
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          disabled={verifyHcp.isPending}
                          onClick={() => {
                            const reason = globalThis.prompt("Rejection reason:");
                            if (reason === null) return;
                            verifyHcp.mutate({
                              id: row.id,
                              decision: "rejected",
                              reason: reason || undefined,
                            });
                          }}
                        >
                          ❌
                        </button>
                      </>
                    )}
                    {row.verification_status === "verified" && (
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={editHcp.isPending}
                        onClick={() =>
                          editHcp.mutate({ id: row.id, action: "suspend" })
                        }
                        title="Suspend"
                      >
                        ⏸
                      </button>
                    )}
                    {(row.verification_status === "expired" ||
                      row.verification_status === "rejected") && (
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={editHcp.isPending}
                        onClick={() =>
                          editHcp.mutate({ id: row.id, action: "reactivate" })
                        }
                        title="Reactivate"
                      >
                        ♻️
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="🩺 Healthcare Professionals"
        subtitle="HCP registry · licensing verification · professional group chats"
      >
        <button className="btn btn-secondary btn-sm" onClick={handleExport}>
          📥 Export
        </button>
        <button
          className="btn btn-primary text-white font-black uppercase tracking-widest text-3xs"
          onClick={() => setOnboardOpen(true)}
        >
          + Add Professional
        </button>
      </PageHeader>

      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-xs font-bold text-emerald-800">
        🔗 SA Module Connections: HCP records link to Facilities (affiliation),
        Medication (enquiry opt-in), Group Chats (profession assignment) and
        Reviews. Per-HCP Med Enquiry counters show &quot;—&quot; until a responder
        column exists on medication_enquiries (J-D4).
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard icon="🩺" label="Total HCPs" value={String(metrics?.totalHcp ?? 0)} variant="blue" />
        <KpiCard icon="✅" label="Verified & Active" value={String(metrics?.verified ?? 0)} variant="green" />
        <KpiCard icon="⏳" label="Pending Approval" value={String(metrics?.pending ?? 0)} variant="gold" />
        <KpiCard icon="💬" label="Group Chats" value={String(metrics?.groupChats ?? 0)} variant="teal" />
        <KpiCard icon="👨‍⚕️" label="Doctors (MDC)" value={String(doctorsCount)} variant="purple" />
        <KpiCard icon="💊" label="Med Enquiries" value="—" variant="red" />
      </div>

      <Tabs
        value={activeTab}
        className="w-full"
        onValueChange={(tab) => {
          setSelected([]);
          updateParams({ tab: tab === "all" ? undefined : tab });
        }}
      >
        <div className="border-b border-slate-200 w-full overflow-x-auto">
          <TabsList className="bg-transparent h-auto p-0 flex flex-nowrap gap-0 justify-start w-max">
            {[
              { id: "all", label: "All HCPs" },
              { id: "pending", label: `⏳ Pending${metrics ? ` (${metrics.pending})` : ""}` },
              { id: "doctors", label: "👨‍⚕️ Doctors" },
              { id: "nurses", label: "👩‍⚕️ Nurses & Midwives" },
              { id: "pharmacists", label: "💊 Pharmacists" },
              { id: "allied", label: "🩺 Allied Health" },
              { id: "chats", label: `💬 Group Chats${metrics ? ` (${metrics.groupChats})` : ""}` },
            ].map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "shrink-0 whitespace-nowrap px-4 py-3 text-2xs font-black uppercase tracking-widest",
                  "text-slate-400 border-b-2 border-transparent transition-all rounded-none outline-none cursor-pointer",
                  "hover:text-emerald-700 hover:bg-emerald-50/40",
                  "data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-emerald-700 data-[state=active]:border-emerald-700",
                )}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {["all", "pending", "doctors", "nurses", "pharmacists", "allied"].map(
          (tabId) => (
            <TabsContent key={tabId} value={tabId} className="mt-5">
              {registryTable}
            </TabsContent>
          ),
        )}

        <TabsContent value="chats" className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-2xs font-black uppercase tracking-widest text-slate-400">
              Professional Group Chats
            </p>
            <Link href="/chats" className="btn btn-primary btn-sm text-white">
              + New Group Chat (Chats module)
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {(data?.groupChats ?? []).map((chat) => (
              <Link
                key={chat.id}
                href={`/chats?group=${chat.id}`}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:border-emerald-300 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-slate-800 truncate">
                    💬 {chat.group_name ?? chat.name ?? "Group Chat"}
                  </p>
                  {chat.is_verified_only && (
                    <span className="shrink-0 text-3xs font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-2 py-0.5">
                      Verified only
                    </span>
                  )}
                </div>
                <p className="text-2xs font-bold uppercase tracking-widest text-slate-400 mt-1">
                  {chat.group_category ?? "General"}
                </p>
                <p className="text-xs font-bold text-slate-500 mt-3">
                  👥 {chat.member_count} member
                  {chat.member_count === 1 ? "" : "s"}
                  {chat.max_members ? ` / ${chat.max_members} cap` : ""}
                </p>
              </Link>
            ))}
            {(data?.groupChats ?? []).length === 0 && !isLoading && (
              <p className="md:col-span-2 xl:col-span-3 text-center text-xs font-bold text-slate-400 py-8">
                No HCP group chats found — create one from the Chats module.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <OnboardHcpDialog open={onboardOpen} onClose={() => setOnboardOpen(false)} />
    </div>
  );
};

export default HCPPage;
