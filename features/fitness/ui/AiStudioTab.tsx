"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AiStudioWorkspace from "./AiStudioWorkspace";
import AiStudioCapabilities from "./AiStudioCapabilities";

/**
 * Fitness AI Studio has two deliberately simple destinations:
 * 1. Create & Logs — one adaptive generation form, inline results and audit log.
 * 2. Capabilities — a plain-language catalogue so every admin knows what the
 *    studio can help with and where a reviewed draft belongs.
 */
const AiStudioTab = () => (
  <div className="w-full min-w-0 space-y-5 animate-in fade-in duration-500">
    <div className="rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-5 text-white shadow-lg sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-2xs font-black uppercase tracking-[0.22em] text-emerald-300">
            Fitness administration copilot
          </div>
          <h2 className="mt-2 text-2xl font-black">🤖 Fitness AI Studio</h2>
          <p className="mt-2 max-w-3xl text-xs font-medium leading-5 text-slate-300">
            Create review-ready fitness drafts with a model you choose, inspect
            the results on the same page and audit every AI call in one place.
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-slate-200">
          <span className="font-black text-amber-300">Human review required:</span>{" "}
          AI never publishes directly.
        </div>
      </div>
    </div>

    <Tabs defaultValue="workspace" className="w-full min-w-0">
      <TabsList className="grid h-auto w-full max-w-xl grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
        <TabsTrigger
          value="workspace"
          className="rounded-lg py-2.5 text-xs font-black data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800"
        >
          ✨ Create &amp; Logs
        </TabsTrigger>
        <TabsTrigger
          value="capabilities"
          className="rounded-lg py-2.5 text-xs font-black data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800"
        >
          🧭 Capabilities
        </TabsTrigger>
      </TabsList>

      <TabsContent value="workspace" className="mt-5 outline-none">
        <AiStudioWorkspace />
      </TabsContent>
      <TabsContent value="capabilities" className="mt-5 outline-none">
        <AiStudioCapabilities />
      </TabsContent>
    </Tabs>
  </div>
);

export default AiStudioTab;
