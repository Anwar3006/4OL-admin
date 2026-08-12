"use client";

import OperationsModuleDashboard from "../_components/operations-module-dashboard";

const tabs = [
  { id: "all", label: "All Listings" },
  { id: "post", label: "Post a Job" },
  { id: "applicants", label: "Applicants" },
  { id: "cv", label: "Digital CVs" },
  { id: "premium", label: "Premium Services" },
];

export default function JobsPage() {
  return (
    <OperationsModuleDashboard
      module="jobs"
      title="Jobs & Careers"
      subtitle="Healthcare job board, professional opportunities, and digital CV review"
      basePath="/jobs"
      tabs={tabs}
    />
  );
}
