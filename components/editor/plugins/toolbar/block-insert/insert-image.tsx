"use client";

import { ImageIcon } from "lucide-react";

import { useToolbarContext } from "@/components/editor/context/toolbar-context";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { InsertImageDialog } from "./insert-image-dialog";

export function InsertImage() {
  const { activeEditor, showModal } = useToolbarContext();

  return (
    <DropdownMenuItem
      onSelect={() => {
        showModal("Insert Image", (onClose) => (
          <InsertImageDialog activeEditor={activeEditor} onClose={onClose} />
        ));
      }}
      className="cursor-pointer"
    >
      <ImageIcon className="mr-2 h-4 w-4" />
      <span>Image</span>
    </DropdownMenuItem>
  );
}
