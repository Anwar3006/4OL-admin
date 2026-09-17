"use client";

import React from "react";
import {
  AI_MODELS,
  CURRENT_AI_MODELS,
  DEFAULT_AI_MODEL,
  LEGACY_AI_MODELS,
} from "@/features/ai/schema/models";
import { cn } from "@/lib/utils";

type AiModelSelectProps = {
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  selectClassName?: string;
  label?: string;
};

const DEFAULT_SELECT_CLASS =
  "mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs";

/**
 * Shared model picker for every admin AI workflow. The value shown here is
 * sent verbatim to the owning API route; both Fitness and Period validate it
 * against the same curated registry before contacting the provider.
 */
export function AiModelSelect({
  name = "model",
  defaultValue = DEFAULT_AI_MODEL,
  value,
  onChange,
  selectClassName,
  label = "AI model",
}: AiModelSelectProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const selected = value ?? internalValue;
  const blurb = AI_MODELS.find((model) => model.id === selected)?.blurb;

  const update = (next: string) => {
    if (value === undefined) setInternalValue(next);
    onChange?.(next);
  };

  return (
    <label className="form-label">
      {label}
      <select
        name={name}
        value={selected}
        onChange={(event) => update(event.target.value)}
        className={cn(DEFAULT_SELECT_CLASS, selectClassName)}
      >
        <optgroup label="Current">
          {CURRENT_AI_MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.label}
            </option>
          ))}
        </optgroup>
        <optgroup label="Legacy">
          {LEGACY_AI_MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.label}
            </option>
          ))}
        </optgroup>
      </select>
      {blurb && (
        <span className="mt-1 block text-2xs font-medium normal-case tracking-normal text-slate-500">
          {blurb}
        </span>
      )}
    </label>
  );
}

export default AiModelSelect;
