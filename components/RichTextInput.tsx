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
    const safeValue = control && name ? undefined : defaultValue || EMPTY_LEXICAL_STATE;
    if (safeValue === undefined) return undefined;
    return typeof safeValue === "string" ? JSON.parse(safeValue) : safeValue;
  }, [defaultValue]);

  if (control && name) {
    return (
      <FormField
        control={control}
        name={name}
        render={({ field }) => {
          const safeValue = field.value || EMPTY_LEXICAL_STATE;
          const editorState = useMemo(() => {
            return typeof safeValue === "string" ? JSON.parse(safeValue) : safeValue;
          }, [safeValue]);

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
