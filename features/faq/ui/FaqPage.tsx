"use client";

import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import PageHeader from "@/components/redesign/PageHeader";
import FAQStats from "./FAQStats";
import FAQAccordion, { FAQAccordionCategory } from "./FAQAccordion";
import { useAddFAQDialog } from "@/features/faq/data/dialog-hooks";
import AddFAQDialog from "./add-faq-dialog";
import { downloadCsv } from "@/lib/csv";
import {
  useDeleteFAQ,
  useFAQCategories,
  useFAQs,
} from "@/features/faq/data/useFAQ";

/**
 * FAQ & Help Centre page (Gap Analysis Part AI, MA-D2). Previously rendered
 * a hardcoded sample accordion with dead search/filter controls; now backed
 * by the live `faqs` table with server-side search, category grouping, and
 * edit/delete wired to the CMS hooks. The mobile Help Center reads the same
 * table through get_public_faqs().
 */
const FAQPage = () => {
  const addFAQ = useAddFAQDialog();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const { data: faqsData, isLoading } = useFAQs({
    page: 1,
    limit: 500, // FAQ knowledge base is bounded; single page keeps grouping simple
    search: debouncedSearch || undefined,
  });
  const { data: categoriesData } = useFAQCategories();
  const deleteFAQ = useDeleteFAQ();

  // Lightweight debounce so we don't hit Supabase on every keystroke.
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const grouped: FAQAccordionCategory[] = useMemo(() => {
    const rows = faqsData?.faqs ?? [];
    const categoryNameById = new Map<string, string>(
      ((categoriesData ?? []) as { id: string; name: string }[]).map((c) => [
        c.id,
        c.name,
      ]),
    );

    const byCategory = new Map<string, FAQAccordionCategory>();
    for (const row of rows) {
      const categoryName = row.category_id
        ? categoryNameById.get(row.category_id) ?? "General"
        : "General";
      if (categoryFilter !== "all" && categoryName !== categoryFilter) continue;
      if (!byCategory.has(categoryName)) {
        byCategory.set(categoryName, { category: categoryName, items: [] });
      }
      byCategory.get(categoryName)!.items.push({
        id: row.id,
        question: row.question,
        answer: row.answer,
        category_name: categoryName,
        status: row.status,
      });
    }
    return Array.from(byCategory.values()).sort((a, b) =>
      a.category.localeCompare(b.category),
    );
  }, [faqsData, categoriesData, categoryFilter]);

  const handleEdit = (item: { id: string; question: string; answer: string }) => {
    const row = (faqsData?.faqs ?? []).find((f) => f.id === item.id);
    if (row) addFAQ.open(row);
  };

  const handleDelete = (item: { id: string; question: string }) => {
    if (!confirm(`Delete FAQ "${item.question}"? This cannot be undone.`)) return;
    deleteFAQ.mutate(item.id);
  };

  const handleExport = () => {
    const rows = faqsData?.faqs ?? [];
    if (rows.length === 0) {
      toast.error("No FAQs to export.");
      return;
    }
    const categoryNameById = new Map<string, string>(
      ((categoriesData ?? []) as { id: string; name: string }[]).map((c) => [
        c.id,
        c.name,
      ]),
    );
    downloadCsv(
      rows.map((r) => ({
        question: r.question,
        answer: r.answer,
        category: r.category_id
          ? categoryNameById.get(r.category_id) ?? "General"
          : "General",
        status: r.status,
      })),
      "faqs",
    );
    toast.success("FAQ export downloaded.");
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="❓ FAQ & Help Centre"
        subtitle="Platform FAQ knowledge base — published articles power the mobile Help Center"
      >
        <button className="btn btn-secondary btn-sm" onClick={handleExport}>📥 Export</button>
        <button className="btn btn-primary btn-sm text-white font-black uppercase tracking-widest text-3xs" onClick={() => addFAQ.open()}>+ Add Article</button>
      </PageHeader>

      <FAQStats />

      <div className="fbar flex flex-wrap gap-2 items-center mb-6">
        <input
          className="flex-1 min-w-[240px] h-8 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-ek-green/20 outline-none"
          placeholder="🔍 Search FAQs by keyword, topic, category..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="h-8 px-2 rounded-lg border border-slate-200 text-xs font-medium bg-white outline-none"
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
        >
          <option value="all">Category: All</option>
          {((categoriesData ?? []) as { id: string; name: string }[]).map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => {
            const next: Record<string, boolean> = {};
            grouped.forEach((cat, idx) => {
              cat.items.forEach((_, itemIdx) => {
                next[`${idx}-${itemIdx}`] = true;
              });
            });
            setExpandedCategories(next);
            toast.info("Expand/collapse is handled inside each accordion group.");
          }}
        >
          Expand All
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setExpandedCategories({})}
        >
          Collapse All
        </button>
      </div>

      <FAQAccordion
        categories={grouped}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <AddFAQDialog />
    </div>
  );
};

export default FAQPage;
