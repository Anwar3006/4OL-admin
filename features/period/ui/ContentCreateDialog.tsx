"use client";

/**
 * "New content" -- one dialog, two ways in.
 *
 * Manual and AI creation used to live on opposite sides of the app: the
 * manual form was an inline card that pushed the content table down the
 * page, and the AI form was on a different route entirely (/ai-hub/period/
 * content), so producing an article meant knowing which of two unrelated
 * screens to start from. They are the same intent, so they are the same
 * dialog with a mode toggle.
 *
 * Both modes end at a draft in period_content with status 'draft'. Neither
 * publishes -- the Content tab's row actions still own that transition, and
 * clinical review still gates it.
 */

import React, { useState } from "react";
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

type Mode = "manual" | "ai";

export default function ContentCreateDialog({
  open,
  onClose,
  events,
  rewards,
  saving,
  onManualSubmit,
}: {
  open: boolean;
  onClose: () => void;
  events: Row[];
  rewards: Row[];
  saving: boolean;
  onManualSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const [mode, setMode] = useState<Mode>("manual");
  const [sourceMenus, setSourceMenus] = useState<string[]>([
    "healthy_living",
    "conditions",
    "symptoms",
  ]);
  const [error, setError] = useState<string | null>(null);
  const { runningJobTypes, startJob } = useAiJobContext();
  const generating = runningJobTypes.has("content_suggestion");

  const generate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sourceMenus.length) {
      setError("Select at least one approved source menu.");
      return;
    }
    if (generating) return;
    setError(null);
    const body = buildContentGenerateBody(new FormData(event.currentTarget), {
      jobType: "content_suggestion",
      sourceMenus,
    });
    // Fire-and-forget: the provider above this route owns the request, so
    // closing this dialog (or leaving the page) does not cancel it.
    void startJob({
      body,
      label: "Content draft",
      reviewPath: "/period?tab=content",
    });
    onClose();
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="📚 New Period Library content" size="wide">
      <div
        className="mb-4 flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1"
        role="tablist"
        aria-label="Content creation mode"
      >
        {(
          [
            { id: "manual", label: "✍️ Write manually" },
            { id: "ai", label: "🤖 Generate with AI" },
          ] as const
        ).map((item) => (
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
            Grounded editorial copilot — drafts use only the approved
            encyclopedia records you select below and never introduce outside
            facts. Every draft lands as <strong>draft</strong> for editorial
            and clinical review; AI never self-publishes.
          </div>

          <SourceMenuChecklist value={sourceMenus} onChange={setSourceMenus} />
          <TopicField />
          <ContentGenerateFields />

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={generating}>
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generating ? "Generating…" : "Generate drafts"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
