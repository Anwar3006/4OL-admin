"use client";

import React from "react";
import PageHeader from "@/components/redesign/PageHeader";
import FAQStats from "./_components/FAQStats";
import FAQAccordion from "./_components/FAQAccordion";

const FAQPage = () => {
  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="❓ FAQ & Help Centre"
        subtitle="20 platform FAQs · AI chatbot integrated · Knowledge base"
      >
        <button className="btn btn-secondary btn-sm">📥 Export</button>
        <button className="btn btn-primary btn-sm text-white font-black uppercase tracking-widest text-[9px]">+ Add Article</button>
      </PageHeader>

      <FAQStats />

      <div className="fbar flex flex-wrap gap-2 items-center mb-6">
        <input className="flex-1 min-w-[240px] h-8 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-ek-green/20 outline-none" placeholder="🔍 Search FAQs by keyword, topic, category..." />
        <select className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-medium bg-white outline-none"><option>Category: All</option></select>
        <select className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-medium bg-white outline-none"><option>Sort: Most Viewed</option></select>
        <button className="btn btn-secondary btn-sm">Expand All</button>
        <button className="btn btn-secondary btn-sm">Collapse All</button>
      </div>

      <FAQAccordion />
    </div>
  );
};

export default FAQPage;
