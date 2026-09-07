"use client";

import React, { useState } from "react";
import { ChevronRight, Loader2, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type FAQAccordionItem = {
  id: string;
  question: string;
  answer: string;
  category_name: string | null;
  status?: string;
};

export type FAQAccordionCategory = {
  category: string;
  items: FAQAccordionItem[];
};

/**
 * FAQ accordion (Gap Analysis Part AI, MA-D2). Previously hardcoded two
 * categories of sample copy; now renders the live `faqs` table grouped by
 * category, with per-item edit/delete wired to the FAQ CMS hooks.
 */
export default function FAQAccordion({
  categories,
  isLoading,
  onEdit,
  onDelete,
}: {
  categories: FAQAccordionCategory[];
  isLoading?: boolean;
  onEdit?: (item: FAQAccordionItem) => void;
  onDelete?: (item: FAQAccordionItem) => void;
}) {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 text-xs font-semibold text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading FAQs...
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-xs font-semibold text-slate-400">
        No FAQs yet. Use “+ Add Article” to create the first one.
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {categories.map((cat, catIdx) => (
        <div key={cat.category}>
          <h3 className="text-2xs font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">
            {cat.category} ({cat.items.length})
          </h3>
          <div className="space-y-2">
            {cat.items.map((item, itemIdx) => {
              const id = `${catIdx}-${itemIdx}`;
              const isOpen = openItems[id];
              return (
                <div
                  key={item.id}
                  className={cn(
                    "bg-white border rounded-xl overflow-hidden transition-all duration-200",
                    isOpen ? "border-ek-green-dark shadow-sm" : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <div className="w-full flex items-center justify-between p-4 text-left group">
                    <button
                      onClick={() => toggleItem(id)}
                      className="flex-1 flex items-center justify-between text-left"
                    >
                      <span className={cn("text-xs font-bold transition-colors", isOpen ? "text-ek-green-dark" : "text-slate-700 group-hover:text-slate-900")}>
                        {item.question}
                      </span>
                      <ChevronRight className={cn("w-4 h-4 shrink-0 text-slate-400 transition-transform duration-200", isOpen ? "rotate-90 text-ek-green-dark" : "")} />
                    </button>
                    {(onEdit || onDelete) && (
                      <span className="ml-2 flex items-center gap-1">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(item)}
                            className="p-1.5 rounded-md text-slate-400 hover:bg-slate-50 hover:text-ek-green-dark"
                            title="Edit FAQ"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(item)}
                            className="p-1.5 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500"
                            title="Delete FAQ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                  <div
                    className={cn(
                      "overflow-hidden transition-all duration-300 ease-in-out",
                      isOpen ? "max-h-[500px] border-t border-slate-50" : "max-h-0"
                    )}
                  >
                    <div className="p-4 text-sm text-slate-500 leading-relaxed font-medium bg-slate-50/30 whitespace-pre-wrap">
                      {item.answer}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
