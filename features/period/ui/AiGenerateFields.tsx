"use client";

/**
 * The building blocks every AI generation form on the Period module shares.
 *
 * Generation used to live only on the AI Hub page, so the field list, the
 * source-menu checklist and the request-body shape were all inline in
 * AiHubWorkspace.tsx. Generation now happens from dialogs on the Period
 * tabs (New content, Generate suggestions) while AI Hub keeps the job
 * history, so those pieces live here -- one definition, three callers.
 *
 * Keeping buildContentGenerateBody here matters more than the markup: the
 * POST body has to match GenerateSchema in ../api/ai-hub.ts, and that
 * contract was previously spelled out in whichever component happened to
 * submit the form.
 */

import React from "react";
import { DEFAULT_AI_MODEL } from "@/features/ai/schema/models";
import { AiModelSelect } from "@/features/ai/ui/AiModelSelect";
import TopicCategorySelect from "./TopicCategorySelect";

export const FIELD =
  "mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs";

export const SOURCE_MENUS = [
  { value: "healthy_living", label: "🥗 Healthy Living" },
  { value: "conditions", label: "🩺 Diseases & Conditions" },
  { value: "symptoms", label: "🌡 Symptoms" },
] as const;

export function SourceMenuChecklist({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (menu: string) =>
    onChange(
      value.includes(menu)
        ? value.filter((item) => item !== menu)
        : [...value, menu],
    );
  return (
    <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <legend className="form-label mb-1">
        Approved source menus (at least one)
      </legend>
      {SOURCE_MENUS.map((menu) => (
        <label
          key={menu.value}
          className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300"
        >
          <input
            type="checkbox"
            checked={value.includes(menu.value)}
            onChange={() => toggle(menu.value)}
          />
          {menu.label}
        </label>
      ))}
    </fieldset>
  );
}

/**
 * The model the job runs on. Options come from the curated registry, which
 * the API validates against with the same list -- an admin cannot select a
 * model we have not tested against the Structured Outputs schema.
 */
export function ModelSelect({
  name = "model",
  defaultValue = DEFAULT_AI_MODEL,
}: {
  name?: string;
  defaultValue?: string;
}) {
  return (
    <AiModelSelect
      name={name}
      defaultValue={defaultValue}
      selectClassName={FIELD}
      label="Model"
    />
  );
}

/** Format / audience / tone / length / locale / count / model. */
export function ContentGenerateFields({
  showCount = true,
  defaultFormat = "quick_read",
}: {
  showCount?: boolean;
  defaultFormat?: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <label className="form-label">
        Content format
        <select name="contentFormat" defaultValue={defaultFormat} className={FIELD}>
          <option value="quick_read">Quick read</option>
          <option value="article">Article</option>
          <option value="video">Video script</option>
          <option value="podcast">Podcast script</option>
          <option value="expert_qa">Expert Q&amp;A</option>
        </select>
      </label>
      <label className="form-label">
        Audience
        <select name="audience" defaultValue="general" className={FIELD}>
          <option value="general">General</option>
          <option value="teens">Teens</option>
          <option value="adults">Adults</option>
          <option value="caregivers">Caregivers</option>
        </select>
      </label>
      <label className="form-label">
        Tone
        <select name="tone" defaultValue="supportive" className={FIELD}>
          <option value="supportive">Supportive</option>
          <option value="educational">Educational</option>
          <option value="concise">Concise</option>
        </select>
      </label>
      <label className="form-label">
        Reading length
        <select name="readingLength" defaultValue="medium" className={FIELD}>
          <option value="short">Short</option>
          <option value="medium">Medium</option>
          <option value="long">Long</option>
        </select>
      </label>
      <label className="form-label">
        Locale
        <input name="locale" defaultValue="en-GH" maxLength={12} className={FIELD} />
      </label>
      {showCount && (
        <label className="form-label">
          Draft count (1–12)
          <input
            name="suggestionCount"
            type="number"
            min={1}
            max={12}
            defaultValue={8}
            className={FIELD}
          />
        </label>
      )}
      <ModelSelect />
    </div>
  );
}

export function TopicField({ required = false }: { required?: boolean }) {
  return <TopicCategorySelect name="topic" label="Topic (optional)" required={required} />;
}

/**
 * Shapes a FormData into the POST body GenerateSchema expects. Numbers are
 * coerced here because FormData yields strings and the Zod schema uses
 * z.number(), which does not coerce -- a string there fails the whole
 * request with a 400 the admin sees as "Invalid AI generation request".
 */
export function buildContentGenerateBody(
  form: FormData,
  {
    jobType,
    sourceMenus,
  }: { jobType: string; sourceMenus: string[] },
): Record<string, unknown> {
  const count = Number(form.get("suggestionCount"));
  return {
    jobType,
    sourceMenus,
    topic: form.get("topic") || undefined,
    contentFormat: form.get("contentFormat"),
    audience: form.get("audience"),
    tone: form.get("tone"),
    readingLength: form.get("readingLength"),
    locale: form.get("locale") || "en-GH",
    suggestionCount: Number.isFinite(count) && count > 0 ? count : 8,
    model: form.get("model") || DEFAULT_AI_MODEL,
  };
}
