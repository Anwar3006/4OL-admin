"use client";

import React, { } from "react";


export default function SummaryNote({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-xs text-slate-700 dark:text-slate-300">
      {icon}
      <span>{text}</span>
    </div>
  );
}
