"use client";

import { useEffect, useState } from "react";

type Category = { slug: string; label: string };

const CUSTOM_VALUE = "__custom__";

// Shared "Topic" control for the Period Library content forms (manual
// create in app/(dashboard)/period/page.tsx, AI generation in
// app/(dashboard)/ai-hub/period/_components/Workspace.tsx). Backed by
// period_content_categories so editors pick a consistent label instead of
// retyping free text, with a "Custom…" escape hatch since
// period_content.topic (and period_trivia_questions.topic) stay free-text
// columns — this table is an option list, not a foreign key constraint.
export default function TopicCategorySelect({
  name = "topic",
  defaultValue = "",
  required = false,
  label = "Topic",
}: {
  name?: string;
  defaultValue?: string;
  required?: boolean;
  label?: string;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [custom, setCustom] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/period/categories")
      .then((response) => response.json())
      .then((result) => {
        if (cancelled) return;
        const list: Category[] = Array.isArray(result.categories) ? result.categories : [];
        setCategories(list);
        if (defaultValue && !list.some((item) => item.label === defaultValue)) {
          setCustom(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // defaultValue is only read once, to seed the initial custom-vs-select
    // mode on mount — not a reactive dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <label className="form-label">
      {label}
      {custom ? (
        <input
          name={name}
          required={required}
          maxLength={120}
          defaultValue={defaultValue}
          placeholder="Type a custom topic"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      ) : (
        <select
          name={name}
          required={required}
          defaultValue={defaultValue}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          onChange={(event) => {
            if (event.target.value === CUSTOM_VALUE) setCustom(true);
          }}
        >
          <option value="" disabled={required}>
            {categories.length ? "Select a category" : "Loading categories…"}
          </option>
          {categories.map((item) => (
            <option key={item.slug} value={item.label}>
              {item.label}
            </option>
          ))}
          <option value={CUSTOM_VALUE}>Custom…</option>
        </select>
      )}
    </label>
  );
}
