"use client";

import React, { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AiModelSelect } from "@/features/ai/ui/AiModelSelect";
import { DEFAULT_AI_MODEL } from "@/features/ai/schema/models";
import {
  AI_STUDIO_MODULE_MAP,
  AI_STUDIO_MODULES,
  type AiStudioGenerateRequest,
  type AiStudioGenerateResponse,
  type AiStudioModuleKey,
} from "@/features/fitness/schema/ai-studio";
import AiLogTab from "./AiLogTab";

const FIELD =
  "mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";
const TEXTAREA = `${FIELD} h-auto min-h-24 py-2`;
const RESULTS_PER_PAGE = 3;

const INITIAL_FORM: AiStudioGenerateRequest = {
  module: "exercises",
  model: DEFAULT_AI_MODEL,
  quantity: 3,
  topic: "",
  goal: "",
  audience: "General fitness users",
  difficulty: "mixed",
  duration: "",
  location: "any",
  equipment: "",
  tone: "supportive",
  instructions: "",
};

const AiStudioWorkspace = () => {
  const [form, setForm] = useState<AiStudioGenerateRequest>(INITIAL_FORM);
  const [result, setResult] = useState<AiStudioGenerateResponse | null>(null);
  const [page, setPage] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  const selectedModule = AI_STUDIO_MODULE_MAP[form.module];
  const contextFields = selectedModule.contextFields;
  const pageCount = Math.max(
    1,
    Math.ceil((result?.items.length ?? 0) / RESULTS_PER_PAGE),
  );
  const visibleItems = useMemo(() => {
    const start = (page - 1) * RESULTS_PER_PAGE;
    return result?.items.slice(start, start + RESULTS_PER_PAGE) ?? [];
  }, [page, result]);

  const update = <K extends keyof AiStudioGenerateRequest>(
    key: K,
    value: AiStudioGenerateRequest[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsGenerating(true);
    try {
      const response = await fetch("/api/fitness/ai-studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Generation failed");
      setResult(payload as AiStudioGenerateResponse);
      setPage(1);
      await queryClient.invalidateQueries({
        queryKey: ["fitness-ai-log-stats"],
      });
      toast.success(
        `${payload.items.length} ${selectedModule.label.toLowerCase()} draft${payload.items.length === 1 ? "" : "s"} generated.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyDraft = async (item: (typeof visibleItems)[number]) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(item, null, 2));
      toast.success("Draft copied to the clipboard.");
    } catch {
      toast.error("This browser could not copy the draft.");
    }
  };

  const downloadResults = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `fitness-ai-${result.module}-${result.generatedAt.slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const shows = (field: (typeof contextFields)[number]) =>
    contextFields.includes(field);

  return (
    <div className="space-y-8">
      <form
        onSubmit={submit}
        className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="border-b border-slate-100 p-5 dark:border-slate-700">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-xl dark:bg-purple-500/15">
              {selectedModule.icon}
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                Generate a Fitness draft
              </h3>
              <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                Choose what you need. AI Studio adjusts the form and output for
                that area while keeping one familiar workflow.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <label className="form-label">
              Fitness area
              <select
                className={FIELD}
                value={form.module}
                onChange={(event) => {
                  update("module", event.target.value as AiStudioModuleKey);
                  setResult(null);
                  setPage(1);
                }}
              >
                {AI_STUDIO_MODULES.map((module) => (
                  <option key={module.key} value={module.key}>
                    {module.icon} {module.label}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-2xs font-medium normal-case tracking-normal text-slate-500">
                {selectedModule.description}
              </span>
            </label>

            <AiModelSelect
              value={form.model}
              onChange={(value) => update("model", value as typeof form.model)}
              selectClassName={FIELD}
            />

            <label className="form-label">
              Number of drafts
              <input
                className={FIELD}
                type="number"
                min={1}
                max={12}
                value={form.quantity}
                onChange={(event) =>
                  update(
                    "quantity",
                    Math.min(12, Math.max(1, Number(event.target.value) || 1)),
                  )
                }
              />
              <span className="mt-1 block text-2xs font-medium normal-case tracking-normal text-slate-500">
                Results are shown below in pages of {RESULTS_PER_PAGE}.
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <label className="form-label lg:col-span-2">
              Topic or request
              <input
                className={FIELD}
                required
                minLength={3}
                maxLength={240}
                placeholder={`What should AI create for ${selectedModule.label.toLowerCase()}?`}
                value={form.topic}
                onChange={(event) => update("topic", event.target.value)}
              />
            </label>

            <label className="form-label lg:col-span-2">
              Goal or desired outcome
              <input
                className={FIELD}
                maxLength={500}
                placeholder="e.g. Help beginners build consistency without gym equipment"
                value={form.goal ?? ""}
                onChange={(event) => update("goal", event.target.value)}
              />
            </label>

            {shows("audience") && (
              <label className="form-label">
                Audience
                <input
                  className={FIELD}
                  value={form.audience}
                  onChange={(event) => update("audience", event.target.value)}
                />
              </label>
            )}

            {shows("difficulty") && (
              <label className="form-label">
                Difficulty
                <select
                  className={FIELD}
                  value={form.difficulty}
                  onChange={(event) =>
                    update(
                      "difficulty",
                      event.target.value as AiStudioGenerateRequest["difficulty"],
                    )
                  }
                >
                  <option value="mixed">Mixed levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="not_applicable">Not applicable</option>
                </select>
              </label>
            )}

            {shows("duration") && (
              <label className="form-label">
                Duration or timeframe
                <input
                  className={FIELD}
                  placeholder="e.g. 30 minutes, 4 weeks or one month"
                  value={form.duration ?? ""}
                  onChange={(event) => update("duration", event.target.value)}
                />
              </label>
            )}

            {shows("location") && (
              <label className="form-label">
                Location
                <select
                  className={FIELD}
                  value={form.location}
                  onChange={(event) =>
                    update(
                      "location",
                      event.target.value as AiStudioGenerateRequest["location"],
                    )
                  }
                >
                  <option value="any">Any location</option>
                  <option value="home">Home</option>
                  <option value="gym">Gym</option>
                  <option value="outdoor">Outdoor</option>
                  <option value="not_applicable">Not applicable</option>
                </select>
              </label>
            )}

            {shows("equipment") && (
              <label className="form-label">
                Available equipment
                <input
                  className={FIELD}
                  placeholder="e.g. bodyweight, bands and dumbbells"
                  value={form.equipment ?? ""}
                  onChange={(event) => update("equipment", event.target.value)}
                />
              </label>
            )}

            {shows("tone") && (
              <label className="form-label">
                Tone
                <select
                  className={FIELD}
                  value={form.tone}
                  onChange={(event) =>
                    update(
                      "tone",
                      event.target.value as AiStudioGenerateRequest["tone"],
                    )
                  }
                >
                  <option value="supportive">Supportive</option>
                  <option value="motivating">Motivating</option>
                  <option value="educational">Educational</option>
                  <option value="concise">Concise</option>
                  <option value="professional">Professional</option>
                </select>
              </label>
            )}

            <label className="form-label lg:col-span-2">
              Additional instructions or source data
              <textarea
                className={TEXTAREA}
                maxLength={2000}
                placeholder="Add constraints, metrics to analyse, verified route details, brand wording or anything the AI must respect."
                value={form.instructions ?? ""}
                onChange={(event) => update("instructions", event.target.value)}
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between">
            <span>
              AI creates review drafts only. Nothing generated here is
              automatically published or sent to users.
            </span>
            <button
              type="submit"
              disabled={isGenerating}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-2xs font-black uppercase tracking-widest text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isGenerating ? "Generating…" : "Generate drafts"}
            </button>
          </div>
        </div>
      </form>

      {/* The user asked for output directly beneath the form. Keep this block
          here rather than moving results into a dialog or another tab. */}
      <section className="space-y-4" aria-live="polite">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
              Generated drafts
            </h3>
            <p className="text-xs font-medium text-slate-500">
              Review, copy or download the output before using it in a Fitness module.
            </p>
          </div>
          {result && (
            <button
              type="button"
              onClick={downloadResults}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-2xs font-black uppercase tracking-widest text-slate-600 hover:border-emerald-500 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <Download className="h-3.5 w-3.5" /> Download all
            </button>
          )}
        </div>

        {!result && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center dark:border-slate-700 dark:bg-slate-900/40">
            <div className="text-3xl">✨</div>
            <p className="mt-2 text-sm font-black text-slate-700 dark:text-slate-300">
              Your generated drafts will appear here
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              They stay on this page—no popup and no automatic publishing.
            </p>
          </div>
        )}

        {result && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-2xs font-black uppercase tracking-widest text-slate-500">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                {AI_STUDIO_MODULE_MAP[result.module].label}
              </span>
              <span className="rounded-full bg-purple-50 px-2.5 py-1 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300">
                Selected: {result.model}
              </span>
              {result.providerModel !== result.model && (
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                  Provider response: {result.providerModel}
                </span>
              )}
              <span>{result.items.length} drafts</span>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              {visibleItems.map((item, index) => (
                <article
                  key={`${item.title}-${(page - 1) * RESULTS_PER_PAGE + index}`}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-3xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                        Draft {(page - 1) * RESULTS_PER_PAGE + index + 1}
                      </div>
                      <h4 className="mt-1 text-base font-black text-slate-900 dark:text-slate-100">
                        {item.title}
                      </h4>
                    </div>
                    <button
                      type="button"
                      aria-label={`Copy ${item.title}`}
                      onClick={() => copyDraft(item)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-emerald-500 hover:text-emerald-700 dark:border-slate-700"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-2 text-xs font-medium leading-5 text-slate-600 dark:text-slate-300">
                    {item.summary}
                  </p>

                  <dl className="mt-4 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-700">
                    {item.fields.map((field) => (
                      <div key={`${field.label}-${field.value}`}>
                        <dt className="text-3xs font-black uppercase tracking-widest text-slate-400">
                          {field.label}
                        </dt>
                        <dd className="mt-0.5 whitespace-pre-wrap text-xs font-semibold leading-5 text-slate-700 dark:text-slate-300">
                          {field.value}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  {item.implementation_notes.length > 0 && (
                    <div className="mt-4 rounded-xl bg-blue-50 p-3 dark:bg-blue-500/10">
                      <div className="text-3xs font-black uppercase tracking-widest text-blue-700 dark:text-blue-300">
                        Admin checklist
                      </div>
                      <ul className="mt-1 space-y-1 text-xs font-medium leading-5 text-blue-900 dark:text-blue-200">
                        {item.implementation_notes.map((note) => (
                          <li key={note}>• {note}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {item.safety_notes.length > 0 && (
                    <div className="mt-3 rounded-xl bg-amber-50 p-3 dark:bg-amber-500/10">
                      <div className="text-3xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">
                        Safety review
                      </div>
                      <ul className="mt-1 space-y-1 text-xs font-medium leading-5 text-amber-900 dark:text-amber-200">
                        {item.safety_notes.map((note) => (
                          <li key={note}>• {note}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-100 px-2 py-1 text-3xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            {pageCount > 1 && (
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  aria-label="Previous result page"
                  disabled={page === 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-black text-slate-600 dark:text-slate-300">
                  Page {page} of {pageCount}
                </span>
                <button
                  type="button"
                  aria-label="Next result page"
                  disabled={page === pageCount}
                  onClick={() =>
                    setPage((current) => Math.min(pageCount, current + 1))
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <section className="space-y-4 border-t border-slate-200 pt-8 dark:border-slate-700">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
            AI usage &amp; call logs
          </h3>
          <p className="text-xs font-medium text-slate-500">
            Model, token, latency, cost and failure history now live inside AI Studio.
          </p>
        </div>
        <AiLogTab embedded />
      </section>
    </div>
  );
};

export default AiStudioWorkspace;
