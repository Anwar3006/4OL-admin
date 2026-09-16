"use client";

/**
 * "New content" -- the single entry point for putting an article into the
 * Period Library, however it gets written.
 *
 * There were briefly two dialogs: this one (manual + AI) and a separate
 * "Generate suggestions" one whose only real difference was a job-type
 * select. They POSTed the same endpoint with the same body, so the admin had
 * to know which of two buttons queued the job they wanted -- a distinction
 * the system did not actually make. The job-type select moved in here as a
 * third mode and the other dialog is gone.
 *
 * Three modes, one intent ("I want an article"):
 *   Write manually  -- the editor writes it.
 *   Generate new    -- content_suggestion: propose article ideas from the
 *                      approved encyclopedia.
 *   Curate existing -- content_curation: repackage material already covered.
 *
 * All three end at a draft in period_content with status 'draft'. None of
 * them publish: the Content tab's row actions own that transition and
 * clinical review still gates it.
 */

import React, { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import Modal from "@/components/redesign/Modal";
import { cn } from "@/lib/utils";
import { useAiJobContext } from "@/stores/ai-job-context";
import {
  ContentGenerateFields,
  SourceMenuChecklist,
  TopicField,
  buildContentGenerateBody,
} from "./AiGenerateFields";
import { CreateForm } from "./LibraryOperations";
import type { Row } from "@/features/period/schema/types";

export type ContentCreateMode = "manual" | "generate" | "curate";

const MODES = [
  { id: "manual", label: "✍️ Write manually", jobType: null },
  { id: "generate", label: "🤖 Generate new", jobType: "content_suggestion" },
  { id: "curate", label: "♻️ Curate existing", jobType: "content_curation" },
] as const;

const MODE_BLURB: Record<ContentCreateMode, string> = {
  manual: "",
  generate:
    "Proposes brand-new article ideas grounded only in the approved encyclopedia records you select. Use this when the Library has a gap.",
  curate:
    "Repackages material the encyclopedia already covers into Library-shaped articles. Use this when the facts exist but no Period article says them.",
};

export default function ContentCreateDialog({
  open,
  initialMode = "manual",
  onClose,
  events,
  rewards,
  saving,
  onManualSubmit,
}: {
  open: boolean;
  initialMode?: ContentCreateMode;
  onClose: () => void;
  events: Row[];
  rewards: Row[];
  saving: boolean;
  onManualSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const [mode, setMode] = useState<ContentCreateMode>(initialMode);
  const [sourceMenus, setSourceMenus] = useState<string[]>([
    "healthy_living",
    "conditions",
    "symptoms",
  ]);
  const [error, setError] = useState<string | null>(null);
  const { runningJobTypes, startJob } = useAiJobContext();

  // The AI Suggestions header opens this straight onto an AI mode, so the
  // requested mode has to win each time the dialog opens -- not only on
  // first mount.
  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError(null);
    }
  }, [open, initialMode]);

  const jobType = MODES.find((item) => item.id === mode)?.jobType ?? null;
  const generating = jobType ? runningJobTypes.has(jobType) : false;

  const generate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!jobType) return;
    if (!sourceMenus.length) {
      setError("Select at least one approved source menu.");
      return;
    }
    if (generating) return;
    setError(null);
    // Fire-and-forget: the provider above this route owns the request, so
    // closing this dialog (or leaving the page) does not cancel it.
    void startJob({
      body: buildContentGenerateBody(new FormData(event.currentTarget), {
        jobType,
        sourceMenus,
      }),
      label: mode === "curate" ? "Curated drafts" : "Content drafts",
      reviewPath: "/period?tab=content",
    });
    onClose();
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="📚 New Period Library content" size="wide">
      <div
        className="mb-4 flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1"
        role="tablist"
        aria-label="How to create this content"
      >
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={mode === item.id}
            onClick={() => setMode(item.id)}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors",
              mode === item.id
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div
          className="mb-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-500/15 p-3 text-xs text-red-900 dark:text-red-400"
          role="alert"
        >
          {error}
        </div>
      )}

      {mode === "manual" ? (
        <CreateForm
          activeTab="content"
          events={events}
          rewards={rewards}
          saving={saving}
          onSubmit={onManualSubmit}
          onCancel={onClose}
        />
      ) : (
        <form className="space-y-3" onSubmit={generate} aria-label="Generate content with AI">
          <div
            className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-500/15 p-3 text-2xs text-blue-950 dark:text-blue-400"
            role="note"
          >
            <strong>{MODE_BLURB[mode]}</strong>
            <br />
            Grounded editorial copilot — never introduces facts outside the
            records you select. Every draft lands as <strong>draft</strong> for
            editorial and clinical review; AI never self-publishes.
          </div>

          <SourceMenuChecklist value={sourceMenus} onChange={setSourceMenus} />
          <TopicField />
          <ContentGenerateFields />

          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-2xs text-slate-500">
              Runs in the background — you can keep working, we&apos;ll notify
              you when the drafts are ready for review.
            </span>
            <span className="flex gap-2">
              <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={generating}>
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {generating
                  ? "Generating…"
                  : mode === "curate"
                    ? "Curate drafts"
                    : "Generate drafts"}
              </button>
            </span>
          </div>
        </form>
      )}
    </Modal>
  );
}
