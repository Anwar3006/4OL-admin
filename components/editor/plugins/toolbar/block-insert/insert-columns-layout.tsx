"use client"

import { Columns3Icon } from "lucide-react"

import { useToolbarContext } from "@/components/editor/context/toolbar-context"
import { InsertLayoutDialog } from "@/components/editor/plugins/layout-plugin"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

export function InsertColumnsLayout() {
  const { activeEditor, showModal } = useToolbarContext()

  return (
    <DropdownMenuItem
      onSelect={() =>
        showModal("Insert Columns Layout", (onClose) => (
          <InsertLayoutDialog activeEditor={activeEditor} onClose={onClose} />
        ))
      }
      className="cursor-pointer"
    >
      <Columns3Icon className="mr-2 h-4 w-4" />
      <span>Columns Layout</span>
    </DropdownMenuItem>
  )
}
