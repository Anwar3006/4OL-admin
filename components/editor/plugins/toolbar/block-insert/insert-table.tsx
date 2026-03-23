"use client"

import { TableIcon } from "lucide-react"

import { useToolbarContext } from "@/components/editor/context/toolbar-context"
import { InsertTableDialog } from "@/components/editor/plugins/table-plugin"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

export function InsertTable() {
  const { activeEditor, showModal } = useToolbarContext()

  return (
    <DropdownMenuItem
      onSelect={() =>
        showModal("Insert Table", (onClose) => (
          <InsertTableDialog activeEditor={activeEditor} onClose={onClose} />
        ))
      }
      className="cursor-pointer"
    >
      <TableIcon className="mr-2 h-4 w-4" />
      <span>Table</span>
    </DropdownMenuItem>
  )
}
