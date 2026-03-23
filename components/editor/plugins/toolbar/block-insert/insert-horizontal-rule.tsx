"use client"

import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/react/LexicalHorizontalRuleNode"
import { ScissorsIcon } from "lucide-react"

import { useToolbarContext } from "@/components/editor/context/toolbar-context"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

export function InsertHorizontalRule() {
  const { activeEditor } = useToolbarContext()

  return (
    <DropdownMenuItem
      onSelect={() =>
        activeEditor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)
      }
      className="cursor-pointer"
    >
      <ScissorsIcon className="mr-2 h-4 w-4" />
      <span>Horizontal Rule</span>
    </DropdownMenuItem>
  )
}
