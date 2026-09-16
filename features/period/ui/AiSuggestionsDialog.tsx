"use client";

/**
 * "Generate suggestions" -- the curation/suggestion job dialog.
 *
 * Distinct from ContentCreateDialog on purpose. That one is "I want an
 * article, help me write it" and is fixed to content_suggestion. This one is
 * the editorial planning pass, where the admin chooses between proposing new
 * article ideas (content_suggestion) and repackaging what already exists
 * (content_curation). Same endpoint, different intent, different entry point
 * -- it opens from the AI Suggestions table header, next to the queue it
 * fills.
 *
 * Ports m-content-ai from admin-panel.html.
 */

import React, { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import Modal from "@/components/redesign/Modal";
import { useAiJobContext } from "@/stores/ai-job-context";
import {
  FIELD,
  ContentGenerateFields,
  SourceMenuChecklist,
  TopicField,
  buildContentGenerateBody,
} from "./AiGenerateFields";

const JOB_TYPES = [
  {
    value: "content_suggestion",
    label: "Content suggestion (new article ideas)",
  },
  {
    value: "content_curation",
    label: "Content curation (repackage existing)",
  },
] as const;

export default function AiSuggestionsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [jobType, setJobType] = useState<string>(JOB_TYPES[0].value);
  const [sourceMenus, setSourceMenus] = useState<string[]>([
    "healthy_living",
    "conditions",
    "symptoms",
  ]);
  const [error, setError] = useState<string | null>(null);
  const { runningJobTypes, startJob } = useAiJobContext();
  const generating = runningJobTypes.has(jobType);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sourceMenus.length) {
      setError("Select at least one approved source menu.");
      return;
    }
    if (generating) return;
    setError(null);
    void startJob({
      body: buildContentGenerateBody(new FormData(event.currentTarget), {
        jobType,
        sourceMenus,
      }),
      label: jobType.replaceAll("_", " "),
      reviewPath: "/period?tab=content",
    });
    onClose();
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="🤖 Generate AI content suggestions"
      size="wide"
    >
      <form className="space-y-3" onSubmit={submit} aria-label="Generate AI content suggestions">
        <div
          className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-500/15 p-3 text-2xs text-blue-950 dark:text-blue-400"
          role="note"
        >
          Grounded editorial copilot — uses only approved encyclopedia
          records, never introduces outside facts. Suggestions appear in the
          AI Suggestions table below; you set the schedule date, frequency cap
          and duration manually before anything reaches the Library.
        </div>

        {error && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-500/15 p-3 text-xs text-red-900 dark:text-red-400"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="form-label">
            Job type
            <select
              value={jobType}
              onChange={(event) => setJobType(event.target.value)}
              className={FIELD}
            >
              {JOB_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <TopicField />
        </div>

        <SourceMenuChecklist value={sourceMenus} onChange={setSourceMenus} />
        <ContentGenerateFields />

        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-2xs text-slate-500">
            Runs in the background — you can keep working, we&apos;ll notify you
            when the drafts are ready.
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
              {generating ? "Generating…" : "Generate suggestions"}
            </button>
          </span>
        </div>
      </form>
    </Modal>
  );
}
