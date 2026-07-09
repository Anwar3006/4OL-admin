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
 * Safely resolves a field/default value into a SerializedEditorState.
 * Handles three shapes seen in the wild:
 *  - already a parsed Lexical object -> returned as-is
 *  - a JSON string produced by this editor -> parsed
 *  - a plain string from legacy/CSV-seeded text columns (not valid JSON,
 *    e.g. "Stand tall with feet hip-width apart...") -> wrapped into a
 *    real paragraph so the content still shows up, instead of crashing or
 *    silently wiping the field.
 */
function resolveEditorState(
  value: string | SerializedEditorState,
): SerializedEditorState {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
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
