"use client";
import React, { memo, useMemo } from "react";

import { Control } from "react-hook-form";
import { SerializedEditorState } from "lexical";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Editor } from "@/components/blocks/editor-x/editor";
import { EMPTY_LEXICAL_STATE } from "@/constants/rich-text-editor";

/**
 * Wraps a plain string (e.g. legacy/seeded `text` column data that was
 * never authored through this editor) into a minimal valid Lexical
 * SerializedEditorState, so real content is preserved and rendered as a
 * single paragraph instead of being silently discarded when JSON.parse
 * fails on it.
 */
function plainTextToLexicalState(text: string): SerializedEditorState {
  return JSON.parse(
    JSON.stringify({
      root: {
        children: [
          {
            children: text
              ? [
                  {
                    detail: 0,
                    format: 0,
                    mode: "normal",
                    style: "",
                    text,
                    type: "text",
                    version: 1,
                  },
                ]
              : [],
            direction: text ? "ltr" : null,
            format: "",
            indent: 0,
            type: "paragraph",
            version: 1,
          },
        ],
        direction: text ? "ltr" : null,
        format: "",
        indent: 0,
        type: "root",
        version: 1,
      },
    }),
  );
}

/**
 * Lexical requires root.children to always contain at least one node (its
 * own "empty" state is one empty paragraph, never zero children) — passing
 * it a root with no children throws "the editor state is empty. Ensure the
 * editor state's root node never becomes empty." This guards against every
 * shape that can produce that: `{}`, `{ root: {} }`,
 * `{ root: { children: [] } }`, etc. — any of which can come from a jsonb
 * column that was written as `{}` instead of null/a real Lexical doc.
 */
function ensureNonEmptyLexicalState(parsed: any): SerializedEditorState {
  if (
    parsed &&
    parsed.root &&
    Array.isArray(parsed.root.children) &&
    parsed.root.children.length > 0
  ) {
    return parsed;
  }
  return plainTextToLexicalState("");
}

/**
 * Safely resolves a field/default value into a SerializedEditorState.
 * Handles the shapes seen in the wild:
 *  - already a parsed Lexical object -> validated, used as-is if healthy
 *  - a JSON string produced by this editor -> parsed, then validated
 *  - a plain string from legacy/CSV-seeded text columns (not valid JSON,
 *    e.g. "Stand tall with feet hip-width apart...") -> wrapped into a
 *    real paragraph so the content still shows up, instead of crashing or
 *    silently wiping the field.
 *  - `{}` or a root with no children (malformed/empty jsonb from a DB
 *    column, e.g. symptoms.about) -> repaired into a valid empty state,
 *    instead of being handed to Lexical as-is and crashing it.
 */
function resolveEditorState(
  value: string | SerializedEditorState | null | undefined,
): SerializedEditorState {
  if (value === null || value === undefined) {
    return JSON.parse(EMPTY_LEXICAL_STATE);
  }
  if (typeof value !== "string") return ensureNonEmptyLexicalState(value);
  try {
    return ensureNonEmptyLexicalState(JSON.parse(value));
  } catch {
    return plainTextToLexicalState(value);
  }
}

interface RichTextEditorProps {
  control?: Control<any>;
  name?: string;
  label?: string;
  defaultValue?: any;
  onChange?: (value: any) => void;
}

function RichTextEditorComponent({
  control,
  name,
  label,
  defaultValue,
  onChange,
}: RichTextEditorProps) {
  const editorSerializedState = useMemo(() => {
    const safeValue =
      control && name ? undefined : defaultValue || EMPTY_LEXICAL_STATE;
    if (safeValue === undefined) return undefined;
    return resolveEditorState(safeValue);
  }, [defaultValue]);

  if (control && name) {
    return (
      <FormField
        control={control}
        name={name}
        render={({ field }) => {
          const safeValue = field.value || EMPTY_LEXICAL_STATE;
          const editorState = useMemo(
            () => resolveEditorState(safeValue),
            [safeValue],
          );

          return (
            <FormItem className="flex flex-col gap-2">
              {label && <FormLabel>{label}</FormLabel>}
              <FormControl>
                <div className="relative overflow-hidden rounded-md border border-input bg-background shadow-sm focus-within:ring-1 focus-within:ring-ring">
                  <Editor
                    editorSerializedState={editorState}
                    onSerializedChange={(value) => field.onChange(value)}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          );
        }}
      />
    );
  }

  return (
    <FormItem className="flex flex-col gap-2">
      {label && <FormLabel>{label}</FormLabel>}
      <div className="relative overflow-hidden rounded-md border border-input bg-background shadow-sm focus-within:ring-1 focus-within:ring-ring">
        <Editor
          editorSerializedState={editorSerializedState}
          onSerializedChange={onChange}
        />
      </div>
    </FormItem>
  );
}

export const RichTextEditor = memo(RichTextEditorComponent);
