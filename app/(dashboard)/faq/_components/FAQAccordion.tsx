"use client";

import React, { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const faqData = [
  {
    category: "Getting Started",
    items: [
      {
        q: "1. What is 4 Our Life and who is it for?",
        a: "4 Our Life is a comprehensive digital health platform designed for Ghanaians. It connects users with healthcare facilities, pharmacies, licensed healthcare professionals (HCPs), and wellness services — all in one app."
      },
      {
        q: "2. How do I create a 4 Our Life account?",
        a: "Download the 4 Our Life app from the Google Play Store or Apple App Store. Open the app and tap Create Account. Enter your phone number, set a secure password, and verify via OTP."
      },
      {
        q: "3. What are the subscription plans?",
        a: "4 Our Life offers four plans: Free, Starter (₵25/month), Pro (₵45/month), and Elite (₵89/month). Each tier adds more features like AI symptom checkers, HCP messaging, and advanced analytics."
      }
    ]
  },
  {
    category: "Privacy & Data",
    items: [
      {
        q: "How is my data protected?",
        a: "We adhere strictly to the Ghana Data Protection Act 2012. All health data is encrypted and anonymized before being used for AI training or analytics."
      }
    ]
  }
];

export default function FAQAccordion() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = (id: string) => {
    setOpenItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {faqData.map((cat, catIdx) => (
        <div key={catIdx}>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">{cat.category}</h3>
          <div className="space-y-2">
            {cat.items.map((item, itemIdx) => {
              const id = `${catIdx}-${itemIdx}`;
              const isOpen = openItems[id];
              return (
                <div 
                  key={itemIdx} 
                  className={cn(
                    "bg-white border rounded-xl overflow-hidden transition-all duration-200",
                    isOpen ? "border-ek-green-dark shadow-sm" : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <button 
                    onClick={() => toggleItem(id)}
                    className="w-full flex items-center justify-between p-4 text-left group"
                  >
                    <span className={cn("text-xs font-bold transition-colors", isOpen ? "text-ek-green-dark" : "text-slate-700 group-hover:text-slate-900")}>
                      {item.q}
                    </span>
                    <ChevronRight className={cn("w-4 h-4 text-slate-400 transition-transform duration-200", isOpen ? "rotate-90 text-ek-green-dark" : "")} />
                  </button>
                  <div 
                    className={cn(
                      "overflow-hidden transition-all duration-300 ease-in-out",
                      isOpen ? "max-h-[500px] border-t border-slate-50" : "max-h-0"
                    )}
                  >
                    <div className="p-4 text-[12px] text-slate-500 leading-relaxed font-medium bg-slate-50/30">
                      {item.a}
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
