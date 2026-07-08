// business-hours-display.tsx
"use client";

import { cn } from "@/lib/utils";
import { Clock, AlertCircle } from "lucide-react";

const formatTime = (time: string) => time || "00:00";

const BusinessHoursDisplay = ({ businessHours }: { businessHours: any[] }) => {
  if (!businessHours || businessHours.length === 0) return null;

  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todayHours = businessHours.find((h) => h.day === today);

  return (
    <section className="space-y-4">
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 text-emerald-600" />
        Operating Hours
        {todayHours?.isClosed ? (
          <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-none font-bold uppercase tracking-widest">
            Closed Today
          </span>
        ) : (
          <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-none font-bold uppercase tracking-widest">
            Open Today
          </span>
        )}
      </h3>

      <div className="bg-white border border-slate-200 p-5 space-y-3">
        <div className="grid grid-cols-1 gap-y-2">
          {businessHours.map((item) => (
            <div
              key={item.day}
              className="flex justify-between items-center text-sm"
            >
              <span
                className={cn(
                  "font-bold text-[12px]",
                  item.day === today ? "text-emerald-600" : "text-slate-500",
                )}
              >
                {item.day}
              </span>

              {item.isClosed ? (
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
                  Closed
                </span>
              ) : (
                <span className="font-mono text-[11px] bg-slate-50 px-2 py-1 border border-slate-200 text-slate-700">
                  {formatTime(item.open)} — {formatTime(item.close)}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="pt-3 mt-3 border-t border-slate-200">
          <p className="text-[11px] text-slate-500 leading-relaxed flex items-start gap-1.5 italic">
            <AlertCircle className="w-3 h-3 mt-0.5 shrink-0 text-slate-400" />
            Weekend services vary. Please call the facility to confirm holiday
            hours or emergency availability.
          </p>
        </div>
      </div>
    </section>
  );
};

export default BusinessHoursDisplay;
