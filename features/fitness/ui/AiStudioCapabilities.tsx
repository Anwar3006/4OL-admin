"use client";

import React from "react";
import { AI_STUDIO_MODULES } from "@/features/fitness/schema/ai-studio";

const AiStudioCapabilities = () => (
  <div className="space-y-5">
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
      <h3 className="text-sm font-black text-blue-950 dark:text-blue-200">
        What Fitness AI Studio can do
      </h3>
      <p className="mt-1 text-xs font-medium leading-5 text-blue-800 dark:text-blue-300">
        Every result is a review draft. AI can accelerate research and writing,
        but an admin must verify catalogue data, rewards, analytics, route facts
        and safety guidance before publishing or sending anything to users.
      </p>
    </div>

    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {AI_STUDIO_MODULES.map((module) => (
        <section
          key={module.key}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl dark:bg-emerald-500/15">
              {module.icon}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                {module.label}
              </h3>
              <p className="mt-0.5 text-xs font-medium leading-5 text-slate-500">
                {module.description}
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {module.capabilities.map((capability) => (
              <li
                key={capability}
                className="flex gap-2 text-xs font-semibold leading-5 text-slate-700 dark:text-slate-300"
              >
                <span className="mt-0.5 text-emerald-600 dark:text-emerald-400">✓</span>
                <span>{capability}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-slate-100 pt-3 text-2xs font-black uppercase tracking-widest text-slate-400 dark:border-slate-700">
            Review destination: {module.destination}
          </div>
        </section>
      ))}
    </div>
  </div>
);

export default AiStudioCapabilities;
