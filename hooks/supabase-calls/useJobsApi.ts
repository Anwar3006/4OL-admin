/**
 * Route-backed hooks for the Jobs & Recruitment surface
 * (Gap Analysis Part K, K-Phase 3). All reads/writes go through the
 * RBAC-guarded /api/jobs routes.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, jsonBody } from "@/lib/api-fetch";

export const JOBS_API_KEYS = {
  all: ["jobs-api"] as const,
  postings: () => [...JOBS_API_KEYS.all, "postings"] as const,
  postingsList: (params: JobListParams) =>
    [...JOBS_API_KEYS.postings(), { ...params }] as const,
  applicants: () => [...JOBS_API_KEYS.all, "applicants"] as const,
  applicantsList: (params: ApplicantListParams) =>
    [...JOBS_API_KEYS.applicants(), { ...params }] as const,
  cvs: () => [...JOBS_API_KEYS.all, "cvs"] as const,
  cvsList: (params: DigitalCvListParams) =>
    [...JOBS_API_KEYS.cvs(), { ...params }] as const,
};

export const JOB_TYPES = [
  "full_time",
  "part_time",
  "contract",
  "temporary",
  "internship",
  "locum",
  "volunteer",
] as const;

export const POSTING_STATUSES = [
  "draft",
  "pending_review",
  "published",
  "closed",
  "filled",
  "expired",
] as const;

export const APPLICATION_STATUSES = [
  "pending",
  "reviewed",
  "shortlisted",
  "rejected",
  "hired",
  "withdrawn",
] as const;

/** Statuses an admin can actively move an application to (Part AM: withdrawn
 * is applicant-initiated and only shown as a state, not a destination). */
export const ASSIGNABLE_APPLICATION_STATUSES = APPLICATION_STATUSES.filter(
  (status) => status !== "withdrawn",
);

export const EMPLOYMENT_STATUSES = [
  "unemployed",
  "employed_open",
  "national_service",
  "student_intern",
] as const;

export type PostingStatus = (typeof POSTING_STATUSES)[number];
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface JobPostingRow {
  id: string;
  facility_id: string;
  title: string;
  description?: string | null;
  requirements?: string[];
  job_type: string;
  specialty?: string | null;
  experience_level?: string | null;
  minimum_qualification?: string | null;
  min_experience_years?: number | null;
  required_licence?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  location?: string | null;
  region?: string | null;
  distance_radius_km?: number | null;
  target_demographics?: string[];
  status: PostingStatus;
  is_featured?: boolean;
  featured_until?: string | null;
  posting_rejection_reason?: string | null;
  published_at?: string | null;
  expires_at?: string | null;
  view_count?: number;
  application_count?: number;
  created_at?: string;
  facility_profile?: {
    facility_name?: string | null;
    facility_type?: string | null;
    area?: string | null;
    region?: string | null;
  } | null;
}

export interface JobApplicationRow {
  id: string;
  job_id: string;
  applicant_id: string;
  cover_letter?: string | null;
  resume_url?: string | null;
  portfolio_url?: string | null;
  status: ApplicationStatus;
  review_notes?: string | null;
  reviewed_at?: string | null;
  created_at?: string;
  /** Part AM (mobile wizard) fields. */
  applicant_type?: "hcp" | "non_hcp" | null;
  profession?: string | null;
  specialization?: string | null;
  highest_qualification?: string | null;
  is_boosted?: boolean;
  user_profiles?: {
    first_name?: string | null;
    last_name?: string | null;
  } | null;
  job_postings?: {
    title?: string | null;
    region?: string | null;
    facility_profile?: { facility_name?: string | null } | null;
  } | null;
  licence?: {
    licence_number: string;
    issuing_body: string | null;
    verification_status: string;
  } | null;
}

export interface DigitalCvRow {
  id: string;
  user_id: string;
  specialty?: string | null;
  qualification?: string | null;
  licence_body?: string | null;
  employment_status?: string | null;
  open_to_offers?: boolean;
  documents?: unknown[];
  consent?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  user_profiles?: {
    first_name?: string | null;
    last_name?: string | null;
  } | null;
}

export interface JobListParams {
  page?: number;
  limit?: number;
  search?: string;
  job_type?: string;
  status?: string;
  region?: string;
  specialty?: string;
}

export interface ApplicantListParams {
  page?: number;
  limit?: number;
  job_id?: string;
  status?: string;
  search?: string;
}

export interface DigitalCvListParams {
  page?: number;
  limit?: number;
  employment_status?: string;
  open_to_offers?: string;
}

export interface JobListResponse {
  postings: JobPostingRow[];
  meta: { total: number; totalPages: number; currentPage: number };
  metrics: {
    listings: number;
    applicants: number;
    pendingReview: number;
    pendingApplications: number;
  };
}

export interface ApplicantListResponse {
  applications: JobApplicationRow[];
  meta: { total: number; totalPages: number; currentPage: number };
}

export interface DigitalCvListResponse {
  cvs: DigitalCvRow[];
  meta: { total: number; totalPages: number; currentPage: number };
}

export interface PostJobInput {
  facility_id: string;
  title: string;
  job_type: string;
  description?: string;
  requirements?: string[];
  specialty?: string;
  experience_level?: string;
  minimum_qualification?: string;
  min_experience_years?: number;
  required_licence?: string;
  salary_min?: number;
  salary_max?: number;
  location?: string;
  region?: string;
  distance_radius_km?: number;
  target_demographics?: string[];
  expires_at?: string;
  submit_for_review?: boolean;
}

/** Derived display IDs (K-D5): no new columns, stable per-row values. */
export const postingDisplayId = (row: { id: string; created_at?: string }) => {
  const year = row.created_at ? new Date(row.created_at).getFullYear() : new Date().getFullYear();
  return `JOB-${year}-${row.id.slice(0, 4).toUpperCase()}`;
};

export const applicationDisplayId = (row: { id: string; created_at?: string }) => {
  const year = row.created_at ? new Date(row.created_at).getFullYear() : new Date().getFullYear();
  return `APP-${year}-${row.id.slice(0, 4).toUpperCase()}`;
};

/** K-D7 privacy mask: "Ama K****" — first name full, last name initial. */
export const maskApplicantName = (profile?: {
  first_name?: string | null;
  last_name?: string | null;
} | null) => {
  const first = profile?.first_name?.trim() || "Unknown";
  const lastInitial = profile?.last_name?.trim()?.[0];
  return lastInitial ? `${first} ${lastInitial}****` : first;
};

const invalidateAll = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: JOBS_API_KEYS.all });
};

// ========================= Queries =========================

export const useJobPostings = (params: JobListParams) => {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.search) qs.set("search", params.search);
  if (params.job_type) qs.set("job_type", params.job_type);
  if (params.status) qs.set("status", params.status);
  if (params.region) qs.set("region", params.region);
  if (params.specialty) qs.set("specialty", params.specialty);

  return useQuery<JobListResponse, Error>({
    queryKey: JOBS_API_KEYS.postingsList(params),
    queryFn: () => apiFetch<JobListResponse>(`/api/jobs?${qs.toString()}`),
  });
};

export const useJobApplicants = (params: ApplicantListParams) => {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.job_id) qs.set("job_id", params.job_id);
  if (params.status) qs.set("status", params.status);
  if (params.search) qs.set("search", params.search);

  return useQuery<ApplicantListResponse, Error>({
    queryKey: JOBS_API_KEYS.applicantsList(params),
    queryFn: () => apiFetch<ApplicantListResponse>(`/api/jobs/applicants?${qs.toString()}`),
  });
};

export const useDigitalCvs = (params: DigitalCvListParams) => {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.employment_status) qs.set("employment_status", params.employment_status);
  if (params.open_to_offers) qs.set("open_to_offers", params.open_to_offers);

  return useQuery<DigitalCvListResponse, Error>({
    queryKey: JOBS_API_KEYS.cvsList(params),
    queryFn: () => apiFetch<DigitalCvListResponse>(`/api/jobs/cvs?${qs.toString()}`),
  });
};

// ========================= Mutations =========================

export const usePostJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PostJobInput) =>
      apiFetch<{ ok: boolean; id: string; status: string }>("/api/jobs", jsonBody(input)),
    onSuccess: (data) => {
      invalidateAll(queryClient);
      toast.success(
        data.status === "pending_review"
          ? "Job submitted for review"
          : "Job saved as draft",
      );
    },
    onError: (error: Error) => toast.error(`Post job failed: ${error.message}`),
  });
};

export const useEditJobPosting = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      action?: "close" | "repost" | "feature" | "unfeature";
      [key: string]: unknown;
    }) =>
      apiFetch<{ ok: boolean }>(`/api/jobs/${input.id}`, {
        ...jsonBody(input),
        method: "PATCH",
      }),
    onSuccess: (_, variables) => {
      invalidateAll(queryClient);
      const labels: Record<string, string> = {
        close: "Job posting closed",
        repost: "Job posting sent back for review",
        feature: "Job posting featured",
        unfeature: "Job posting unfeatured",
      };
      toast.success(variables.action ? labels[variables.action] : "Job posting updated");
    },
    onError: (error: Error) => toast.error(`Update failed: ${error.message}`),
  });
};

export const useReviewJobPosting = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      decision: "approved" | "rejected";
      reason?: string;
    }) =>
      apiFetch<{ ok: boolean }>(`/api/jobs/${input.id}/review`, {
        ...jsonBody({ decision: input.decision, reason: input.reason }),
        method: "PATCH",
      }),
    onSuccess: (_, variables) => {
      invalidateAll(queryClient);
      toast.success(
        variables.decision === "approved"
          ? "Posting approved and published"
          : "Posting rejected — returned to draft",
      );
    },
    onError: (error: Error) => toast.error(`Review failed: ${error.message}`),
  });
};

export const useUpdateApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      status: ApplicationStatus;
      review_notes?: string;
    }) =>
      apiFetch<{ ok: boolean }>(`/api/jobs/applications/${input.id}`, {
        ...jsonBody({ status: input.status, review_notes: input.review_notes }),
        method: "PATCH",
      }),
    onSuccess: (_, variables) => {
      invalidateAll(queryClient);
      toast.success(`Application marked ${variables.status}`);
    },
    onError: (error: Error) => toast.error(`Update failed: ${error.message}`),
  });
};

export const useJobsBulk = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { ids: string[]; action: "close" | "repost" }) =>
      apiFetch<{ ok: boolean; updated: number }>("/api/jobs/bulk", jsonBody(input)),
    onSuccess: (data, variables) => {
      invalidateAll(queryClient);
      toast.success(
        `${data.updated} posting(s) ${variables.action === "close" ? "closed" : "reposted"}`,
      );
    },
    onError: (error: Error) => toast.error(`Bulk action failed: ${error.message}`),
  });
};

// ========================= Export =========================

export async function downloadJobsCsv() {
  const res = await fetch("/api/jobs/export", { cache: "no-store" });
  if (!res.ok) {
    let message = `Export failed (${res.status})`;
    try {
      const payload = await res.json();
      if (payload?.error) message = String(payload.error);
    } catch {
      // keep the generic message
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `job-postings-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
