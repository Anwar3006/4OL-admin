import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $wrapNodeInElement, mergeRegister } from "@lexical/utils";
import {
  $createParagraphNode,
  $createRangeSelection,
  $getSelection,
  $insertNodes,
  $isNodeSelection,
  $isRootOrShadowRoot,
  $setSelection,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  createCommand,
  DRAGOVER_COMMAND,
  DRAGSTART_COMMAND,
  DROP_COMMAND,
  LexicalCommand,
  LexicalEditor,
  PASTE_COMMAND,
} from "lexical";
import { useEffect } from "react";
import {
  $createSupabaseImageNode,
  $isSupabaseImageNode,
  ImagePayload,
  SupabaseImageNode,
} from "../nodes/supabase-image-node.js";
import { JSX } from "react";
import {
  uploadImageToSupabase,
  uploadBlobToSupabase,
} from "../utils/upload-image.js";

export type InsertImagePayload = Readonly<ImagePayload>;

const handlePaste = (event: ClipboardEvent, editor: LexicalEditor): boolean => {
  // Start async work but don't wait
  void (async () => {
    await onPaste(event, editor);
  })();

  // Return true to claim the event was handled
  // Or false if you want other handlers to run
  return false;
};

const getDOMSelection = (targetWindow: Window | null): Selection | null =>
  (targetWindow || window).getSelection();

export const INSERT_IMAGE_COMMAND: LexicalCommand<InsertImagePayload> =
  createCommand("INSERT_IMAGE_COMMAND");
export function ImagesPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([SupabaseImageNode])) {
      throw new Error(
        "ImagesPlugin: SupabaseImageNode not registered on editor",
      );
    }

    return mergeRegister(
      editor.registerCommand<InsertImagePayload>(
        INSERT_IMAGE_COMMAND,
        (payload) => {
          const imageNode = $createSupabaseImageNode(payload);
          $insertNodes([imageNode]);
          if ($isRootOrShadowRoot(imageNode.getParentOrThrow())) {
            $wrapNodeInElement(imageNode, $createParagraphNode).selectEnd();
          }

          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand<DragEvent>(
        DRAGSTART_COMMAND,
        (event) => {
          return onDragStart(event);
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand<DragEvent>(
        DRAGOVER_COMMAND,
        (event) => {
          return onDragover(event);
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand<DragEvent>(
        DROP_COMMAND,
        (event) => {
          return onDrop(event, editor);
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand<ClipboardEvent>(
        PASTE_COMMAND,
        (event) => {
          console.log("Pasted: ", event?.clipboardData?.items);
          const items = Array.from(event.clipboardData?.items || []);
          const hasImage = items.some((item) => item.type.startsWith("image/"));
          const htmlData = event.clipboardData?.getData("text/html");
          const hasHtmlImage = htmlData && htmlData.includes("<img");

          if (hasImage || hasHtmlImage) {
            onPaste(event, editor);
            return true;
          }

          return false;
        },
        COMMAND_PRIORITY_HIGH,
      ),
    );
  }, [editor]);

  return null;
}

function onDragStart(event: DragEvent): boolean {
  const node = getImageNodeInSelection();
  if (!node) {
    return false;
  }
  const dataTransfer = event.dataTransfer;
  if (!dataTransfer) {
    return false;
  }
  dataTransfer.setData("text/plain", "_");
  dataTransfer.setData(
    "application/x-lexical-drag",
    JSON.stringify({
      data: {
        altText: node.__altText,
        caption: node.__caption,
        height: node.__height,
        key: node.getKey(),
        maxWidth: node.__maxWidth,
        src: node.__src,
        width: node.__width,
      },
      type: "image",
    }),
  );

  return true;
}

function onDragover(event: DragEvent): boolean {
  const node = getImageNodeInSelection();
  if (!node) {
    return false;
  }
  if (!canDropImage(event)) {
    event.preventDefault();
  }
  return true;
}

function onDrop(event: DragEvent, editor: LexicalEditor): boolean {
  const node = getImageNodeInSelection();
  if (!node) {
    return false;
  }
  const data = getDragImageData(event);
  if (!data) {
    return false;
  }
  event.preventDefault();
  if (canDropImage(event)) {
    const range = getDragSelection(event);
    node.remove();
    const rangeSelection = $createRangeSelection();
    if (range !== null && range !== undefined) {
      rangeSelection.applyDOMRange(range);
    }
    $setSelection(rangeSelection);
    editor.dispatchCommand(INSERT_IMAGE_COMMAND, data);
  }
  return true;
}

function onPaste(event: ClipboardEvent, editor: LexicalEditor): boolean {
  const items = Array.from(event.clipboardData?.items || []);

  // Check for image files in clipboard
  for (const item of items) {
    if (item.type.startsWith("image/")) {
      event.preventDefault();

      const file = item.getAsFile();
      if (!file) continue;

      // Show loading state (you might want to add a loading indicator)
      // const result = await uploadImageToSupabase(file);

      // if (result.error) {
      //   console.error("Failed to upload image:", result.error);
      //   // You might want to show an error toast here
      //   return true;
      // }

      editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
        altText: file.name,
        src: "",
      });

      return true;
    }
  }

  // Check for HTML with images
  const htmlData = event.clipboardData?.getData("text/html");
  if (htmlData) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlData, "text/html");
    const images = doc.getElementsByTagName("img");

    // if (images.length > 0) {
    //   event.preventDefault();

    //   for (const img of Array.from(images)) {
    //     const src = img.src;

    //     // If it's a data URL, upload it
    //     if (src.startsWith("data:")) {
    //       try {
    //         const response = await fetch(src);
    //         const blob = await response.blob();
    //         const result = await uploadBlobToSupabase(blob, "pasted-image.png");

    //         if (!result.error) {
    //           editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
    //             altText: img.alt || "Pasted image",
    //             src: result.publicUrl,
    //           });
    //         }
    //       } catch (error) {
    //         console.error("Failed to process pasted image:", error);
    //       }
    //     } else if (!src.startsWith("file:///")) {
    //       // For regular URLs, just insert them directly
    //       editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
    //         altText: img.alt || "Image",
    //         src: src,
    //       });
    //     }
    //   }

    //   return true;
    // }
  }

  return false;
}

function getImageNodeInSelection(): SupabaseImageNode | null {
  const selection = $getSelection();
  if (!$isNodeSelection(selection)) {
    return null;
  }
  const nodes = selection.getNodes();
  const node = nodes[0];
  return $isSupabaseImageNode(node) ? node : null;
}

function getDragImageData(event: DragEvent): null | InsertImagePayload {
  const dragData = event.dataTransfer?.getData("application/x-lexical-drag");
  if (!dragData) {
    return null;
  }
  const { type, data } = JSON.parse(dragData);
  if (type !== "image") {
    return null;
  }

  return data;
}

declare global {
  interface DragEvent {
    rangeOffset?: number;
    rangeParent?: Node;
  }
}

function canDropImage(event: DragEvent): boolean {
  const target = event.target;
  return !!(
    target &&
    target instanceof HTMLElement &&
    !target.closest("code, span.editor-image") &&
    target.parentElement &&
    target.parentElement.closest("div.editor-shell")
  );
}

function getDragSelection(event: DragEvent): Range | null | undefined {
  let range;
  const target = event.target as null | Element | Document;
  const targetWindow =
    target == null
      ? null
      : target.nodeType === 9
        ? (target as Document).defaultView
        : (target as Element).ownerDocument.defaultView;
  const domSelection = getDOMSelection(targetWindow);
  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(event.clientX, event.clientY);
  } else if (event.rangeParent && domSelection !== null) {
    domSelection.collapse(event.rangeParent, event.rangeOffset || 0);
    range = domSelection.getRangeAt(0);
  } else {
    throw Error("Cannot get the selection when dragging");
  }

  return range;
}
