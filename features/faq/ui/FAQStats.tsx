"use client";

import React from "react";
import KpiCard from "@/components/redesign/KpiCard";
import { useFAQStats } from "@/features/faq/data/useFAQ";

export default function FAQStats() {
  const { data: stats, isLoading, isError } = useFAQStats();
  const livePct =
    stats && stats.totalFaqs > 0 ? Math.round((stats.activeFaqs / stats.totalFaqs) * 100) : null;

  return (
    // useFAQStats (features/faq/data/useFAQ.ts) does one pass over the live
    // `faqs` table and sums/counts columns — no dated series anywhere in it,
    // so none of these four qualifies for a trend or `lg` sizing (Rule 1).
    // Active and Total FAQs count the same table (published vs all rows),
    // so — like Subscriptions' Active/Total card — they merge into one
    // fraction instead of the old "value + `N total` badge" pairing that
    // said the same thing twice. Active/Total (catalog coverage) and
    // Helpful Rate (the one real quality signal admins act on) stay at
    // default size; Categories and Total Views are supporting detail.
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-6">
      <KpiCard
        icon="📊"
        label="Active / Total FAQs"
        value={`${stats?.activeFaqs?.toLocaleString() ?? "0"} / ${stats?.totalFaqs?.toLocaleString() ?? "0"}`}
        variant="blue"
        delta={livePct === null ? "No FAQs yet" : `${livePct}% of catalog live`}
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
        size="sm"
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
        size="sm"
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
