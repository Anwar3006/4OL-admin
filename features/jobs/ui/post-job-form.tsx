"use client";

/**
 * Post-a-Job form (Gap Analysis Part K, K4/K-D6). Submissions land as
 * 'draft' or 'pending_review' — publication requires an approve step in
 * the Pending Requests queue. Facility picker feeds from the guarded
 * /api/facilities route (active facilities only).
 */

import React, { useState } from "react";
import { GHANA_REGIONS_ENUM } from "@/types/formInput";
import { useFacilitiesApiList } from "@/features/facilities/data/useFacilitiesApi";
import {
  JOB_TYPES,
  usePostJob,
  type PostJobInput,
} from "@/features/jobs/data/useJobsApi";

const EMPTY_FORM = {
  facility_id: "",
  title: "",
  job_type: "full_time",
  specialty: "",
  experience_level: "",
  minimum_qualification: "",
  min_experience_years: "",
  required_licence: "",
  salary_min: "",
  salary_max: "",
  location: "",
  region: "",
  distance_radius_km: "",
  target_demographics: "",
  expires_at: "",
  description: "",
  requirements: "",
};

const PostJobForm = () => {
  const [form, setForm] = useState(EMPTY_FORM);
  const { data: facilities } = useFacilitiesApiList({ limit: 100, status: "active" });
  const postJob = usePostJob();

  const set = (key: keyof typeof EMPTY_FORM, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const buildPayload = (submitForReview: boolean): PostJobInput => ({
    facility_id: form.facility_id,
    title: form.title.trim(),
    job_type: form.job_type,
    description: form.description.trim() || undefined,
    requirements: form.requirements
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    specialty: form.specialty.trim() || undefined,
    experience_level: form.experience_level.trim() || undefined,
    minimum_qualification: form.minimum_qualification.trim() || undefined,
    min_experience_years: form.min_experience_years
      ? Number(form.min_experience_years)
      : undefined,
    required_licence: form.required_licence.trim() || undefined,
    salary_min: form.salary_min ? Number(form.salary_min) : undefined,
    salary_max: form.salary_max ? Number(form.salary_max) : undefined,
    location: form.location.trim() || undefined,
    region: form.region || undefined,
    distance_radius_km: form.distance_radius_km
      ? Number(form.distance_radius_km)
      : undefined,
    target_demographics: form.target_demographics
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    expires_at: form.expires_at
      ? new Date(`${form.expires_at}T23:59:59`).toISOString()
      : undefined,
    submit_for_review: submitForReview,
  });

  const handleSubmit = async (submitForReview: boolean) => {
    if (!form.facility_id || !form.title.trim()) return;
    try {
      await postJob.mutateAsync(buildPayload(submitForReview));
      setForm(EMPTY_FORM);
    } catch {
      // toast handled by the hook
    }
  };

  const inputClass =
    "w-full h-9 px-3 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-emerald-500/20 outline-none";
  const labelClass =
    "text-3xs font-black uppercase tracking-widest text-slate-400 mb-1 block";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
      <div>
        <h2 className="text-lg font-black text-slate-900">📝 Post a Job</h2>
        <p className="text-2xs font-bold text-slate-400 uppercase tracking-widest">
          Draft stays private · Submit for Review enters the approval queue
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Facility *</label>
          <select
            className={inputClass}
            value={form.facility_id}
            onChange={(e) => set("facility_id", e.target.value)}
          >
            <option value="">Select facility...</option>
            {(facilities?.data ?? []).map((facility) => (
              <option key={facility.id} value={facility.id}>
                {facility.facility_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Job Title *</label>
          <input
            className={inputClass}
            placeholder="e.g. Registered General Nurse"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Job Type *</label>
          <select
            className={inputClass}
            value={form.job_type}
            onChange={(e) => set("job_type", e.target.value)}
          >
            {JOB_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Specialty</label>
          <input
            className={inputClass}
            placeholder="e.g. Emergency Care"
            value={form.specialty}
            onChange={(e) => set("specialty", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Minimum Qualification</label>
          <input
            className={inputClass}
            placeholder="e.g. BSc Nursing"
            value={form.minimum_qualification}
            onChange={(e) => set("minimum_qualification", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Required Licence</label>
          <input
            className={inputClass}
            placeholder="e.g. NMC full practice licence"
            value={form.required_licence}
            onChange={(e) => set("required_licence", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Min Experience (years)</label>
          <input
            className={inputClass}
            type="number"
            min={0}
            value={form.min_experience_years}
            onChange={(e) => set("min_experience_years", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Experience Level</label>
          <input
            className={inputClass}
            placeholder="e.g. Mid-level"
            value={form.experience_level}
            onChange={(e) => set("experience_level", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Salary Min (GHS)</label>
          <input
            className={inputClass}
            type="number"
            min={0}
            value={form.salary_min}
            onChange={(e) => set("salary_min", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Salary Max (GHS)</label>
          <input
            className={inputClass}
            type="number"
            min={0}
            value={form.salary_max}
            onChange={(e) => set("salary_max", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Location</label>
          <input
            className={inputClass}
            placeholder="e.g. Osu, Accra"
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Region</label>
          <select
            className={inputClass}
            value={form.region}
            onChange={(e) => set("region", e.target.value)}
          >
            <option value="">Select region...</option>
            {GHANA_REGIONS_ENUM.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Distance Radius (km)</label>
          <input
            className={inputClass}
            type="number"
            min={0}
            value={form.distance_radius_km}
            onChange={(e) => set("distance_radius_km", e.target.value)}
          />
          <p className="text-3xs font-bold text-slate-400 mt-1">
            K-D4: stored for future geo-matching — live radius search needs the
            geolocation pipeline.
          </p>
        </div>
        <div>
          <label className={labelClass}>Application Deadline</label>
          <input
            className={inputClass}
            type="date"
            value={form.expires_at}
            onChange={(e) => set("expires_at", e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Target Demographics (comma separated)</label>
          <input
            className={inputClass}
            placeholder="e.g. new graduates, locum seekers"
            value={form.target_demographics}
            onChange={(e) => set("target_demographics", e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Description</label>
          <textarea
            className="w-full min-h-[90px] px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-emerald-500/20 outline-none"
            placeholder="Role overview, duties, working hours..."
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Requirements (one per line)</label>
          <textarea
            className="w-full min-h-[70px] px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-emerald-500/20 outline-none"
            placeholder={"Valid NMC licence\n2+ years clinical experience"}
            value={form.requirements}
            onChange={(e) => set("requirements", e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
        <button
          className="btn btn-secondary btn-sm disabled:opacity-40"
          disabled={postJob.isPending || !form.facility_id || !form.title.trim()}
          onClick={() => handleSubmit(false)}
        >
          Save as Draft
        </button>
        <button
          className="btn btn-primary btn-sm text-white disabled:opacity-40"
          disabled={postJob.isPending || !form.facility_id || !form.title.trim()}
          onClick={() => handleSubmit(true)}
        >
          {postJob.isPending ? "Submitting..." : "Submit for Review"}
        </button>
      </div>
    </div>
  );
};

export default PostJobForm;
