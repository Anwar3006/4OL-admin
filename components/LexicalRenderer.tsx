"use client";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { nodes } from "./blocks/editor-x/nodes";
import { useEffect, useMemo, useState } from "react";
import { SerializedEditorState } from "lexical";

export function LexicalRenderer({
  initialState,
}: {
  initialState: SerializedEditorState | null | undefined;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [editorState, setEditorState] = useState<string | null>(null);

  // Only render on client to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);

    if (initialState) {
      try {
        const stateString = JSON.stringify(initialState);
        setEditorState(stateString);
      } catch (error) {
        console.error("Error serializing editor state:", error);
        setEditorState(null);
      }
    }
  }, [initialState]);

  const config = useMemo(
    () => ({
      namespace: "Read-Only-Viewer",
      editable: false,
      editorState: editorState,
      theme: {
        paragraph: "mb-3 last:mb-0",
        text: {
          bold: "font-bold text-slate-900",
          italic: "italic",
          underline: "underline",
        },
        list: {
          ol: "list-decimal ml-6 space-y-1",
          ul: "list-disc ml-6 space-y-1",
          listitem: "pl-1",
        },
        link: "text-blue-600 hover:underline cursor-pointer",
      },
      nodes: nodes,
      onError: (error: Error) => {
        // Handle missing node types gracefully
        if (
          error.message.includes("not found") ||
          error.message.includes("parseEditorState")
        ) {
          console.warn("Lexical parsing warning:", error.message);
        } else {
          console.error("Lexical error:", error);
        }
      },
    }),
    [editorState],
  );

  // Don't render during SSR or if no state
  if (!isMounted || !editorState) {
    return null;
  }

  return (
    <LexicalComposer initialConfig={config}>
      <RichTextPlugin
        contentEditable={<ContentEditable className="outline-none" />}
        placeholder={null}
        ErrorBoundary={LexicalErrorBoundary}
      />
    </LexicalComposer>
  );
}
