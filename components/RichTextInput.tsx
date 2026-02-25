"use client";

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
  control: Control<any>;
  name: string;
  label: string;
}

export function RichTextEditor({ control, name, label }: RichTextEditorProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const safeValue = field.value || EMPTY_LEXICAL_STATE;
        return (
          <FormItem className="flex flex-col gap-2">
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <div className="relative overflow-hidden rounded-md border border-input bg-background shadow-sm focus-within:ring-1 focus-within:ring-ring">
                <Editor
                  editorSerializedState={
                    typeof safeValue === "string"
                      ? JSON.parse(safeValue)
                      : safeValue
                  }
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
