"use client";

/**
 * "New trivia" -- the single entry point for everything that goes into a
 * Friday Trivia, mirroring ContentCreateDialog on the Content tab.
 *
 * Before this, the three things an admin needs in order to run a Trivia were
 * in three different places: the question form was an inline card on the
 * Trivia tab, while event scheduling and the reward catalog were forms on
 * /ai-hub/period -- which is why TriviaOperations had a "Schedule & generate"
 * link pointing away from the page. Setting up one Friday meant two screens
 * and a round trip.
 *
 * Four tabs, in the order the work actually happens:
 *   🗓 Event            -- schedule the Friday window.
 *   🏆 Reward           -- add a reusable reward to the catalog.
 *   ✍️ Write question   -- one question, by hand.
 *   🤖 Generate questions -- a grounded set of 10 from the encyclopedia.
 *
 * Everything lands as a draft. Nothing here makes a Trivia live: that is
 * still the review flow on the Trivia tab.
 */

import React, { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import Modal from "@/components/redesign/Modal";
import { cn } from "@/lib/utils";
import { useAiJobContext } from "@/stores/ai-job-context";
import { FIELD, ModelSelect, SourceMenuChecklist } from "./AiGenerateFields";
import type { Row } from "@/features/period/schema/types";

export type TriviaCreateMode = "event" | "reward" | "question" | "generate";

const MODES = [
  { id: "event", label: "🗓 Event" },
  { id: "reward", label: "🏆 Reward" },
  { id: "question", label: "✍️ Write question" },
  { id: "generate", label: "🤖 Generate questions" },
] as const;

export default function TriviaCreateDialog({
  open,
  initialMode = "event",
  onClose,
  events,
  rewards,
  saving,
  mutate,
}: {
  open: boolean;
  initialMode?: TriviaCreateMode;
  onClose: () => void;
  events: Row[];
  rewards: Row[];
  saving: boolean;
  mutate: (body: Record<string, unknown>, success: string) => Promise<boolean>;
}) {
  const [mode, setMode] = useState<TriviaCreateMode>(initialMode);
  const [sourceMenus, setSourceMenus] = useState<string[]>(["healthy_living"]);
  const [error, setError] = useState<string | null>(null);
  const { runningJobTypes, startJob } = useAiJobContext();
  const generating = runningJobTypes.has("trivia_generation");

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError(null);
    }
  }, [open, initialMode]);

  const draftEvents = events.filter((item) => item.status === "draft");

  const submitEvent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const startsAt = String(form.get("startsAt") ?? "");
    const endsAt = String(form.get("endsAt") ?? "");
    if (!startsAt || !endsAt) return;
    if (new Date(endsAt) <= new Date(startsAt)) {
      setError("The event has to end after it starts.");
      return;
    }
    setError(null);
    const ok = await mutate(
      {
        action: "create_trivia_event",
        title: form.get("title"),
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        timezone: form.get("timezone") || "Africa/Accra",
        rewardId: form.get("rewardId") || undefined,
      },
      "Trivia event scheduled as a draft. Attach questions before it goes live.",
    );
    if (ok) onClose();
  };

  const submitReward = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    const ok = await mutate(
      {
        action: "create_trivia_reward",
        name: form.get("name"),
        description: form.get("description"),
        icon: form.get("icon") || "🏆",
        rewardType: form.get("rewardType") || "points",
        value: form.get("value") || undefined,
      },
      "Reward added to the catalog. Attach it to an event, or to a reward tier on the Trivia tab.",
    );
    if (ok) onClose();
  };

  const submitQuestion = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const options = String(form.get("options") ?? "")
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);
    const correct = Number(form.get("correctOption"));
    if (options.length < 2) {
      setError("A question needs at least two answer options, one per line.");
      return;
    }
    // Caught here rather than server-side because the admin is looking at the
    // options list right now and can fix it in place.
    if (!Number.isInteger(correct) || correct < 1 || correct > options.length) {
      setError(`The correct answer number must be between 1 and ${options.length}.`);
      return;
    }
    setError(null);
    const ok = await mutate(
      {
        action: "create_trivia_question",
        topic: form.get("topic"),
        question: form.get("question"),
        options,
        correctOption: correct - 1,
        explanation: form.get("explanation"),
        difficulty: form.get("difficulty"),
        eventId: form.get("eventId") || undefined,
        rewardId: form.get("rewardId") || undefined,
      },
      "Trivia question created for editorial and clinical review.",
    );
    if (ok) onClose();
  };

  const submitGenerate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sourceMenus.length) {
      setError("Select at least one approved source menu.");
      return;
    }
    if (generating) return;
    setError(null);
    const form = new FormData(event.currentTarget);
    const body: Record<string, unknown> = {
      jobType: "trivia_generation",
      sourceMenus,
      topic: form.get("topic") || undefined,
      difficulty: form.get("difficulty"),
      answerCount: Number(form.get("answerCount")),
      model: form.get("model") || undefined,
    };
    const eventId = form.get("eventId");
    if (eventId) body.eventId = eventId;
    const rewardId = form.get("rewardId");
    if (rewardId) body.rewardId = rewardId;
    // Fire-and-forget: the provider above this route owns the request, so
    // closing the dialog does not cancel it.
    void startJob({
      body,
      label: "Trivia questions",
      reviewPath: "/period?tab=trivia",
    });
    onClose();
  };

  const eventSelect = (name: string) => (
    <label className="form-label">
      Attach to event (optional)
      <select name={name} defaultValue="" className={FIELD}>
        <option value="">Unattached draft</option>
        {draftEvents.map((item) => (
          <option key={item.id} value={item.id}>
            {item.title}
          </option>
        ))}
      </select>
    </label>
  );

  const rewardSelect = (label: string) => (
    <label className="form-label">
      {label}
      <select name="rewardId" defaultValue="" className={FIELD}>
        <option value="">No reward set</option>
        {rewards.map((item) => (
          <option key={item.id} value={item.id}>
            {item.icon} {item.name}
          </option>
        ))}
      </select>
    </label>
  );

  const footer = (submitLabel: string, busy: boolean) => (
    <div className="flex items-center justify-end gap-2 pt-1">
      <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
        Cancel
      </button>
      <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {busy ? "Saving…" : submitLabel}
      </button>
    </div>
  );

  return (
    <Modal isOpen={open} onClose={onClose} title="✨ New Friday Trivia" size="wide">
      <div
        className="mb-4 flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1"
        role="tablist"
        aria-label="What to create"
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

      {mode === "event" && (
        <form className="space-y-3" onSubmit={submitEvent} aria-label="Schedule a Trivia event">
          <p className="text-2xs text-slate-500">
            Creates the window mobile unlocks the Trivia in. It starts as a
            draft — attach questions and review it before it can go live.
          </p>
          <label className="form-label">
            Title
            <input name="title" required minLength={3} maxLength={160} className={FIELD} />
          </label>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="form-label">
              Starts
              <input name="startsAt" type="datetime-local" required className={FIELD} />
            </label>
            <label className="form-label">
              Ends
              <input name="endsAt" type="datetime-local" required className={FIELD} />
            </label>
            <label className="form-label">
              Timezone
              <input name="timezone" defaultValue="Africa/Accra" maxLength={80} className={FIELD} />
            </label>
            {rewardSelect("Reward (optional)")}
          </div>
          {footer("Schedule event", saving)}
        </form>
      )}

      {mode === "reward" && (
        <form className="space-y-3" onSubmit={submitReward} aria-label="Add a reward">
          <p className="text-2xs text-slate-500">
            Adds a reusable reward to the catalog. Rewards are not tied to one
            event — attach this to an event here, or build tiered payouts on
            the Trivia tab.
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="form-label">
              Name
              <input
                name="name"
                required
                minLength={2}
                maxLength={120}
                className={FIELD}
                placeholder="e.g. Top scorer payout"
              />
            </label>
            <label className="form-label">
              Icon
              <input name="icon" defaultValue="🏆" maxLength={8} className={FIELD} />
            </label>
            <label className="form-label">
              Type
              <select name="rewardType" defaultValue="cash" className={FIELD}>
                <option value="cash">Cash prize (MoMo payout)</option>
                <option value="airtime">Airtime / data bundle</option>
                <option value="points">Points</option>
                <option value="badge">Badge</option>
                <option value="discount">Discount</option>
                <option value="prize">Physical prize</option>
              </select>
            </label>
            <label className="form-label">
              Value (optional)
              <input
                name="value"
                maxLength={120}
                className={FIELD}
                placeholder="e.g. 100, 500 pts, 10% off"
              />
            </label>
          </div>
          <label className="form-label">
            Description
            <textarea
              name="description"
              required
              minLength={2}
              maxLength={500}
              className={cn(FIELD, "min-h-16")}
            />
          </label>
          {footer("Add reward", saving)}
        </form>
      )}

      {mode === "question" && (
        <form className="space-y-3" onSubmit={submitQuestion} aria-label="Write a trivia question">
          <p className="text-2xs text-slate-500">
            Stays a draft until editorial and clinical review. The explanation
            is shown to the user after they answer.
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="form-label">
              Topic
              <input name="topic" required maxLength={100} className={FIELD} />
            </label>
            <label className="form-label">
              Difficulty
              <select name="difficulty" defaultValue="intermediate" className={FIELD}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
          </div>
          <label className="form-label">
            Question
            <textarea
              name="question"
              required
              minLength={5}
              maxLength={500}
              className={cn(FIELD, "min-h-20")}
            />
          </label>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="form-label">
              Answer options, one per line
              <textarea
                name="options"
                required
                minLength={3}
                className={cn(FIELD, "min-h-28")}
              />
            </label>
            <label className="form-label">
              Correct answer number
              <input
                name="correctOption"
                required
                type="number"
                min={1}
                max={6}
                defaultValue={1}
                className={FIELD}
              />
              <span className="mt-1 block text-2xs text-slate-500">
                Counting from 1, matching the line order above.
              </span>
            </label>
          </div>
          <label className="form-label">
            Learning explanation
            <textarea
              name="explanation"
              required
              minLength={5}
              maxLength={2000}
              className={cn(FIELD, "min-h-24")}
            />
          </label>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {eventSelect("eventId")}
            {rewardSelect("Reward for that event (optional)")}
          </div>
          {footer("Save question", saving)}
        </form>
      )}

      {mode === "generate" && (
        <form className="space-y-3" onSubmit={submitGenerate} aria-label="Generate trivia questions">
          <div
            className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-500/15 p-3 text-2xs text-blue-950 dark:text-blue-400"
            role="note"
          >
            Generates a set of <strong>10 questions</strong> grounded only in
            the approved encyclopedia records you select — never outside facts.
            A set where any question cites an unapproved source fails as a
            whole rather than reaching review.
          </div>

          <SourceMenuChecklist value={sourceMenus} onChange={setSourceMenus} />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="form-label">
              Topic (optional)
              <input
                name="topic"
                maxLength={120}
                className={FIELD}
                placeholder="e.g. luteal phase nutrition"
              />
            </label>
            <label className="form-label">
              Difficulty
              <select name="difficulty" defaultValue="intermediate" className={FIELD}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
            <label className="form-label">
              Answers per question
              <input
                name="answerCount"
                type="number"
                min={2}
                max={6}
                defaultValue={4}
                className={FIELD}
              />
            </label>
            <ModelSelect />
            {eventSelect("eventId")}
            {rewardSelect("Reward for that event (optional)")}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-2xs text-slate-500">
              Runs in the background — you can keep working, we&apos;ll notify
              you when the set is ready for review.
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
                {generating ? "Generating…" : "Generate 10 questions"}
              </button>
            </span>
          </div>
        </form>
      )}
    </Modal>
  );
}
