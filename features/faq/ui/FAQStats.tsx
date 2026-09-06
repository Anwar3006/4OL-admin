"use client";

import React from "react";
import KpiCard from "@/components/redesign/KpiCard";
import { useFAQStats } from "@/features/faq/data/useFAQ";

export default function FAQStats() {
  const { data: stats, isLoading, isError } = useFAQStats();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 mb-6">
      <KpiCard
        icon="📊"
        label="Active FAQs"
        value={stats?.activeFaqs?.toLocaleString() ?? "0"}
        variant="blue"
        delta={`${stats?.totalFaqs ?? 0} total`}
        deltaType="neutral"
        isLoading={isLoading}
        isError={isError}
      />
      <KpiCard
        icon="👍"
        label="Helpful Rate"
        value={stats?.helpfulRate === null || stats?.helpfulRate === undefined ? "—" : `${stats.helpfulRate}%`}
        variant="green"
        delta={stats?.helpfulRate === null || stats?.helpfulRate === undefined ? "No feedback yet" : "Reader thumbs-up rate"}
        deltaType="neutral"
        isLoading={isLoading}
        isError={isError}
      />
      <KpiCard
        icon="📂"
        label="Categories"
        value={stats?.categories?.toLocaleString() ?? "0"}
        variant="gold"
        delta="Organized"
        deltaType="neutral"
        isLoading={isLoading}
        isError={isError}
      />
      <KpiCard
        icon="👁️"
        label="Total Views"
        value={stats?.totalViews?.toLocaleString() ?? "0"}
        variant="teal"
        delta="Lifetime views"
        deltaType="neutral"
        isLoading={isLoading}
        isError={isError}
      />
    </div>
  );
}
