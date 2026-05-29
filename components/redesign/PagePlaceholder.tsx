import React from "react";
import PageHeader from "./PageHeader";

interface PagePlaceholderProps {
  title: string;
  subtitle: string;
  icon: string;
}

export default function PagePlaceholder({ title, subtitle, icon }: PagePlaceholderProps) {
  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader title={title} subtitle={subtitle} />
      
      <div className="card py-32 text-center border border-slate-200 shadow-sm rounded-xl bg-white">
        <div className="max-w-md mx-auto space-y-4">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-center mx-auto text-3xl shadow-sm">
            {icon}
          </div>
          <h3 className="text-xl font-black text-slate-800 tracking-tight">
            {title} Module
          </h3>
          <p className="text-sm text-slate-500 font-medium leading-relaxed px-4">
            We are currently porting this section to the new dashboard architecture. High-fidelity components and real-time data integration are coming soon.
          </p>
          <div className="flex justify-center gap-2 pt-2">
             <span className="badge badge-amber uppercase tracking-widest text-[10px] font-black px-3 py-1">Under Construction</span>
          </div>
        </div>
      </div>
    </div>
  );
}
