"use client";

/**
 * Jobs & Careers surface (Gap Analysis Part K, K-Phase 4).
 * Replaces the OperationsModuleDashboard shell with six live tabs:
 * All Listings (filters + bulk close/repost), Post a Job (form + pending
 * review queue), Applicants (masked names + licence badges), Digital CVs,
 * Premium Services and Business Strategy (static product cards per K-D1/K-D2).
 */

import React, { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import PageHeader from "@/components/redesign/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import KpiCard from "@/components/redesign/KpiCard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useHasPermission } from "@/stores/permission-context";
import { GHANA_REGIONS_ENUM } from "@/types/formInput";
import {
  APPLICATION_STATUSES,
  JOB_TYPES,
  POSTING_STATUSES,
  applicationDisplayId,
  downloadJobsCsv,
  maskApplicantName,
  postingDisplayId,
  useDigitalCvs,
  useEditJobPosting,
  useJobApplicants,
  useJobPostings,
  useJobsBulk,
  useReviewJobPosting,
  useUpdateApplication,
  type ApplicationStatus,
  type JobApplicationRow,
  type JobPostingRow,
} from "@/hooks/supabase-calls/useJobsApi";
import PostJobForm from "./_components/post-job-form";

const POSTING_BADGE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-500 border-slate-200",
  pending_review: "bg-amber-50 text-amber-700 border-amber-100",
  published: "bg-emerald-50 text-emerald-700 border-emerald-100",
  closed: "bg-red-50 text-red-600 border-red-100",
  filled: "bg-indigo-50 text-indigo-700 border-indigo-100",
  expired: "bg-slate-100 text-slate-400 border-slate-200",
};

const APPLICATION_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-100",
  reviewed: "bg-sky-50 text-sky-700 border-sky-100",
  shortlisted: "bg-indigo-50 text-indigo-700 border-indigo-100",
  rejected: "bg-red-50 text-red-600 border-red-100",
  hired: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

const PREMIUM_SERVICES = [
  {
    icon: "⭐",
    name: "Featured Listing",
    price: "GHS 150 / 30 days",
    description: "Posting pinned to the top of the job board with a Featured badge.",
  },
  {
    icon: "🎯",
    name: "Targeted Blast",
    price: "GHS 250 / blast",
    description: "Push notification + in-app alert to matched professionals by specialty and region.",
  },
  {
    icon: "📄",
    name: "CV Vault Access",
    price: "GHS 100 / month",
    description: "Search the digital CV registry and contact open-to-offer professionals.",
  },
];

const STRATEGY_CARDS = [
  {
    icon: "🤝",
    title: "Facility Partnerships",
    body: "Bundle job credits with facility subscriptions so active facilities post at no extra friction.",
  },
  {
    icon: "🎓",
    title: "New Graduate Pipeline",
    body: "Partner with nursing/midwifery training colleges to list entry-level placements and national service slots.",
  },
  {
    icon: "🌍",
    title: "Diaspora Returnee Programme",
    body: "Target Ghanaian HCPs abroad with relocation-friendly listings and re-licensing guidance via MDC/NMC.",
  },
  {
    icon: "📈",
    title: "Locum Marketplace",
    body: "Short-horizon locum shifts fill fast; position as the liquidity engine of the board.",
  },
];

const EMPLOYMENT_STATUS_LABEL: Record<string, string> = {
  unemployed: "Unemployed — available now",
  employed_open: "Employed — open to offers",
  national_service: "National Service",
  student_intern: "Student / Intern",
};

const JobsPage = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const canManage = useHasPermission("jobs.manage");

  const activeTab = searchParams.get("tab") || "listings";
  const search = searchParams.get("search") || "";
  const typeFilter = searchParams.get("type") || "all";
  const statusFilter = searchParams.get("pstatus") || "all";
  const regionFilter = searchParams.get("region") || "all";
  const appStatusFilter = searchParams.get("astatus") || "all";

  const [selected, setSelected] = useState<string[]>([]);

  const { data, isLoading, isFetching } = useJobPostings({
    limit: 50,
    search: search || undefined,
    job_type: typeFilter === "all" ? undefined : typeFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    region: regionFilter === "all" ? undefined : regionFilter,
  });
  const { data: pendingQueue } = useJobPostings({ limit: 20, status: "pending_review" });
  const { data: applicantData, isLoading: applicantsLoading } = useJobApplicants({
    limit: 50,
    status: appStatusFilter === "all" ? undefined : appStatusFilter,
  });
  const { data: cvData, isLoading: cvsLoading } = useDigitalCvs({ limit: 50 });

  const editPosting = useEditJobPosting();
  const reviewPosting = useReviewJobPosting();
  const updateApplication = useUpdateApplication();
  const bulkAction = useJobsBulk();

  const postings = data?.postings ?? [];
  const metrics = data?.metrics;
  const featuredCount = postings.filter((row) => row.is_featured).length;

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
      await downloadJobsCsv();
      toast.success("Job postings exported");
    } catch (error: any) {
      toast.error(error?.message ?? "Export failed");
    }
  };

  const toggleSelect = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );

  const selectClass =
    "h-9 px-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest bg-white outline-none";

  const listingsTable = (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="flex-1 min-w-[220px] h-9 px-4 rounded-xl border border-slate-200 text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-emerald-500/20 outline-none"
          placeholder="🔍 Search job title..."
          value={search}
          onChange={(e) => updateParams({ search: e.target.value })}
        />
        <select
          className={selectClass}
          value={typeFilter}
          onChange={(e) => updateParams({ type: e.target.value })}
        >
          <option value="all">All Types</option>
          {JOB_TYPES.map((type) => (
            <option key={type} value={type}>
              {type.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={statusFilter}
          onChange={(e) => updateParams({ pstatus: e.target.value })}
        >
          <option value="all">All Statuses</option>
          {POSTING_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status.replace(/_/g, " ")}
            </option>
          ))}
        </select>
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
          <span className="text-[10px] font-black uppercase tracking-widest">
            {selected.length} selected
          </span>
          <button
            className="text-[10px] font-black uppercase tracking-widest bg-red-500 rounded-lg px-3 py-1.5 disabled:opacity-40"
            disabled={bulkAction.isPending || !canManage}
            onClick={() => {
              bulkAction.mutate({ ids: selected, action: "close" });
              setSelected([]);
            }}
          >
            🔒 Close Selected
          </button>
          <button
            className="text-[10px] font-black uppercase tracking-widest bg-emerald-500 rounded-lg px-3 py-1.5 disabled:opacity-40"
            disabled={bulkAction.isPending || !canManage}
            onClick={() => {
              bulkAction.mutate({ ids: selected, action: "repost" });
              setSelected([]);
            }}
          >
            ♻️ Repost Selected
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left min-w-[900px]">
          <thead>
            <tr className="text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
              <th className="px-4 py-3 w-8" />
              <th className="px-3 py-3">Posting</th>
              <th className="px-3 py-3">Facility</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Region</th>
              <th className="px-3 py-3">Applicants</th>
              <th className="px-3 py-3">Views</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading || isFetching ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-[11px] font-bold text-slate-400">
                  Loading postings...
                </td>
              </tr>
            ) : postings.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-[11px] font-bold text-slate-400">
                  No job postings match the current filters.
                </td>
              </tr>
            ) : (
              postings.map((row: JobPostingRow) => (
                <tr key={row.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(row.id)}
                      onChange={() => toggleSelect(row.id)}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-[12px] font-black text-slate-800">
                      {row.is_featured && "⭐ "}
                      {row.title}
                    </p>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 rounded px-1.5 py-0.5 font-mono">
                      {postingDisplayId(row)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[11px] font-bold text-slate-600">
                    {row.facility_profile?.facility_name ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-[10px] font-bold uppercase text-slate-500">
                    {row.job_type.replace(/_/g, " ")}
                  </td>
                  <td className="px-3 py-3 text-[10px] font-bold uppercase text-slate-500">
                    {row.region ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-[11px] font-black text-slate-700">
                    {row.application_count ?? 0}
                  </td>
                  <td className="px-3 py-3 text-[11px] font-bold text-slate-500">
                    {row.view_count ?? 0}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "text-[9px] font-black uppercase tracking-widest rounded-full px-2.5 py-1 border",
                        POSTING_BADGE[row.status] ?? POSTING_BADGE.expired,
                      )}
                    >
                      {row.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {row.status === "published" && (
                      <>
                        <button
                          className="btn btn-secondary btn-sm mr-1"
                          disabled={editPosting.isPending || !canManage}
                          onClick={() =>
                            editPosting.mutate({
                              id: row.id,
                              action: row.is_featured ? "unfeature" : "feature",
                            })
                          }
                          title={row.is_featured ? "Unfeature" : "Feature"}
                        >
                          {row.is_featured ? "⭐ Unfeature" : "☆ Feature"}
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          disabled={editPosting.isPending || !canManage}
                          onClick={() =>
                            editPosting.mutate({ id: row.id, action: "close" })
                          }
                          title="Close posting"
                        >
                          🔒
                        </button>
                      </>
                    )}
                    {(row.status === "closed" ||
                      row.status === "expired" ||
                      row.status === "filled") && (
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={editPosting.isPending || !canManage}
                        onClick={() =>
                          editPosting.mutate({ id: row.id, action: "repost" })
                        }
                        title="Repost (back to review queue)"
                      >
                        ♻️ Repost
                      </button>
                    )}
                    {row.status === "draft" && (
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        Edit via repost flow
                      </span>
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

  const pendingQueueSection = (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
      <div>
        <h3 className="text-sm font-black text-slate-900">
          ⏳ Pending Requests ({pendingQueue?.postings.length ?? 0})
        </h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Approve publishes immediately · Reject returns to draft with reason
        </p>
      </div>
      {(pendingQueue?.postings ?? []).length === 0 ? (
        <p className="text-[11px] font-bold text-slate-400 py-4 text-center">
          Review queue is clear. 🎉
        </p>
      ) : (
        (pendingQueue?.postings ?? []).map((row) => (
          <div
            key={row.id}
            className="flex flex-wrap items-center gap-3 border border-slate-100 rounded-xl px-4 py-3"
          >
            <div className="flex-1 min-w-[200px]">
              <p className="text-[12px] font-black text-slate-800">{row.title}</p>
              <p className="text-[10px] font-bold text-slate-400">
                {row.facility_profile?.facility_name ?? "—"} ·{" "}
                {row.job_type.replace(/_/g, " ")} · {row.region ?? "—"}
              </p>
            </div>
            <button
              className="btn btn-primary btn-sm text-white"
              disabled={reviewPosting.isPending || !canManage}
              onClick={() =>
                reviewPosting.mutate({ id: row.id, decision: "approved" })
              }
            >
              ✅ Approve
            </button>
            <button
              className="btn btn-danger btn-sm"
              disabled={reviewPosting.isPending || !canManage}
              onClick={() => {
                const reason = globalThis.prompt("Rejection reason:");
                if (reason === null) return;
                reviewPosting.mutate({
                  id: row.id,
                  decision: "rejected",
                  reason: reason || undefined,
                });
              }}
            >
              ❌ Reject
            </button>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="💼 Jobs & Careers"
        subtitle="Healthcare job board · posting approval · applicant pipeline · digital CVs"
      >
        <button className="btn btn-secondary btn-sm" onClick={handleExport}>
          📥 Export
        </button>
        <button
          className="btn btn-primary text-white font-black uppercase tracking-widest text-[9px]"
          disabled={!canManage}
          onClick={() => updateParams({ tab: "post" })}
        >
          + Post a Job
        </button>
      </PageHeader>

      {!canManage && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-[11px] font-bold text-amber-800">
          🔒 Read-only: your role lacks the jobs.manage permission. Posting,
          review and applicant decisions are disabled.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon="💼" label="Total Listings" value={String(metrics?.listings ?? 0)} variant="blue" />
        <KpiCard icon="👥" label="Applicants" value={String(metrics?.applicants ?? 0)} variant="green" />
        <KpiCard icon="⏳" label="Pending Review" value={String(metrics?.pendingReview ?? 0)} variant="gold" />
        <KpiCard icon="⭐" label="Featured (page)" value={String(featuredCount)} variant="purple" />
      </div>

      <Tabs
        value={activeTab}
        className="w-full"
        onValueChange={(tab) => {
          setSelected([]);
          updateParams({ tab: tab === "listings" ? undefined : tab });
        }}
      >
        <div className="border-b border-slate-200 w-full overflow-x-auto">
          <TabsList className="bg-transparent h-auto p-0 flex flex-nowrap gap-0 justify-start w-max">
            {[
              { id: "listings", label: "All Listings" },
              { id: "post", label: `📝 Post a Job${metrics?.pendingReview ? ` (${metrics.pendingReview} pending)` : ""}` },
              { id: "applicants", label: "👥 Applicants" },
              { id: "cvs", label: "📄 Digital CVs" },
              { id: "premium", label: "💎 Premium Services" },
              { id: "strategy", label: "📈 Business Strategy" },
            ].map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "shrink-0 whitespace-nowrap px-4 py-3 text-[10px] font-black uppercase tracking-widest",
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

        <TabsContent value="listings" className="mt-5">
          {listingsTable}
        </TabsContent>

        <TabsContent value="post" className="mt-5 space-y-4">
          <PostJobForm />
          {pendingQueueSection}
        </TabsContent>

        <TabsContent value="applicants" className="mt-5 space-y-4">
          <div className="bg-sky-50 border border-sky-200 rounded-2xl px-4 py-3 text-[11px] font-bold text-sky-800">
            🔐 K-D7 privacy: applicant names are masked (first name + last
            initial). Full identities unlock at the shortlist step in the
            mobile flow; licence badges come from HCP verification records.
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              className={selectClass}
              value={appStatusFilter}
              onChange={(e) => updateParams({ astatus: e.target.value })}
            >
              <option value="all">All Statuses</option>
              {APPLICATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead>
                <tr className="text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                  <th className="px-4 py-3">Applicant</th>
                  <th className="px-3 py-3">Applied For</th>
                  <th className="px-3 py-3">Licence</th>
                  <th className="px-3 py-3">Documents</th>
                  <th className="px-3 py-3">Applied</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Move To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applicantsLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[11px] font-bold text-slate-400">
                      Loading applicants...
                    </td>
                  </tr>
                ) : (applicantData?.applications ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[11px] font-bold text-slate-400">
                      No applications match the current filters.
                    </td>
                  </tr>
                ) : (
                  (applicantData?.applications ?? []).map(
                    (app: JobApplicationRow) => (
                      <tr key={app.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <p className="text-[12px] font-black text-slate-800">
                            {maskApplicantName(app.user_profiles)}
                          </p>
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 rounded px-1.5 py-0.5 font-mono">
                            {applicationDisplayId(app)}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-[11px] font-bold text-slate-700">
                            {app.job_postings?.title ?? "—"}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400">
                            {app.job_postings?.facility_profile?.facility_name ?? "—"}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          {app.licence ? (
                            <span
                              className={cn(
                                "text-[9px] font-black uppercase tracking-widest rounded-full px-2.5 py-1 border",
                                app.licence.verification_status === "verified"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                  : "bg-slate-100 text-slate-500 border-slate-200",
                              )}
                            >
                              {app.licence.issuing_body ?? "Licence"} ·{" "}
                              {app.licence.verification_status}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-[10px] font-bold text-slate-500">
                          {app.resume_url ? "📄 CV" : ""}{" "}
                          {app.cover_letter ? "✉️ Letter" : ""}{" "}
                          {!app.resume_url && !app.cover_letter ? "—" : ""}
                        </td>
                        <td className="px-3 py-3 text-[10px] font-bold text-slate-500">
                          {app.created_at
                            ? new Date(app.created_at).toLocaleDateString("en-GB")
                            : "—"}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={cn(
                              "text-[9px] font-black uppercase tracking-widest rounded-full px-2.5 py-1 border",
                              APPLICATION_BADGE[app.status] ?? APPLICATION_BADGE.pending,
                            )}
                          >
                            {app.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <select
                            className="h-8 px-2 rounded-lg border border-slate-200 text-[9px] font-black uppercase tracking-widest bg-white outline-none disabled:opacity-40"
                            disabled={updateApplication.isPending || !canManage}
                            value={app.status}
                            onChange={(e) =>
                              updateApplication.mutate({
                                id: app.id,
                                status: e.target.value as ApplicationStatus,
                              })
                            }
                          >
                            {APPLICATION_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ),
                  )
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="cvs" className="mt-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-[11px] font-bold text-amber-800">
            🔐 K-D3: the Digital CV vault is metadata-only today. AES
            encryption-at-rest, consent gates and HSM key management ship with
            the platform-security epic.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {cvsLoading ? (
              <p className="md:col-span-2 xl:col-span-3 text-center text-[11px] font-bold text-slate-400 py-8">
                Loading digital CVs...
              </p>
            ) : (cvData?.cvs ?? []).length === 0 ? (
              <p className="md:col-span-2 xl:col-span-3 text-center text-[11px] font-bold text-slate-400 py-8">
                No digital CVs submitted yet — the mobile flow collects them
                from job-seeking professionals.
              </p>
            ) : (
              (cvData?.cvs ?? []).map((cv) => (
                <div
                  key={cv.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-black text-slate-800">
                      {cv.user_profiles?.first_name ?? "Unknown"}{" "}
                      {cv.user_profiles?.last_name?.[0] ?? ""}****
                    </p>
                    {cv.open_to_offers && (
                      <span className="shrink-0 text-[8px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-2 py-0.5">
                        Open to offers
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                    {EMPLOYMENT_STATUS_LABEL[cv.employment_status ?? ""] ??
                      cv.employment_status ??
                      "—"}
                  </p>
                  <div className="mt-3 space-y-1 text-[11px] font-bold text-slate-600">
                    <p>🎓 {cv.qualification ?? "—"}</p>
                    <p>🩺 {cv.specialty ?? "—"}</p>
                    <p>🏛️ {cv.licence_body ?? "—"}</p>
                    <p>📎 {(cv.documents ?? []).length} document(s)</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="premium" className="mt-5 space-y-4">
          <div className="bg-sky-50 border border-sky-200 rounded-2xl px-4 py-3 text-[11px] font-bold text-sky-800">
            💎 K-D2: product catalogue is live for planning; billing wiring and
            revenue figures land with the payments epic — revenue shows &quot;—&quot;
            until then.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PREMIUM_SERVICES.map((service) => (
              <div
                key={service.name}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-2"
              >
                <p className="text-2xl">{service.icon}</p>
                <p className="text-[13px] font-black text-slate-800">{service.name}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                  {service.price}
                </p>
                <p className="text-[11px] font-bold text-slate-500">
                  {service.description}
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 pt-2 border-t border-slate-100">
                  Revenue: —
                </p>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="strategy" className="mt-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {STRATEGY_CARDS.map((card) => (
              <div
                key={card.title}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-2"
              >
                <p className="text-[13px] font-black text-slate-800">
                  {card.icon} {card.title}
                </p>
                <p className="text-[11px] font-bold text-slate-500">{card.body}</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default JobsPage;
