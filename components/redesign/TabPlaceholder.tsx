import React from "react";

interface TabPlaceholderProps {
  title: string;
  description: string;
  icon: string;
}

/**
 * Inner "under construction" card used inside individual tabs — same visual
 * treatment as PagePlaceholder, but without its own PageHeader, since the
 * parent page (e.g. hcp/page.tsx) already renders one shared header above
 * the Tabs component.
 */
export default function TabPlaceholder({
  title,
  description,
  icon,
}: TabPlaceholderProps) {
  return (
    <div className="card py-24 text-center border border-slate-200 shadow-sm rounded-xl bg-white">
      <div className="max-w-md mx-auto space-y-4">
        <div className="w-16 h-16 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-center mx-auto text-2xl shadow-sm">
          {icon}
        </div>
        <h3 className="text-lg font-black text-slate-800 tracking-tight">
          {title}
        </h3>
        <p className="text-sm text-slate-500 font-medium leading-relaxed px-4">
          {description}
        </p>
        <div className="flex justify-center gap-2 pt-2">
          <span className="badge badge-amber uppercase tracking-widest text-[10px] font-black px-3 py-1">
            Under Construction
          </span>
        </div>
      </div>
    </div>
  );
}
