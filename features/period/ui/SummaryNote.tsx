"use client";

import React, { } from "react";


export default function SummaryNote({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 text-[11px] text-slate-700">
      {icon}
      <span>{text}</span>
    </div>
  );
}
