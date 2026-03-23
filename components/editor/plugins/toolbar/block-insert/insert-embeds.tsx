"use client"

import { INSERT_EMBED_COMMAND } from "@lexical/react/LexicalAutoEmbedPlugin"

import { useToolbarContext } from "@/components/editor/context/toolbar-context"
import { EmbedConfigs } from "@/components/editor/plugins/embeds/auto-embed-plugin"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

export function InsertEmbeds() {
  const { activeEditor } = useToolbarContext()
  return EmbedConfigs.map((embedConfig) => (
    <DropdownMenuItem
      key={embedConfig.type}
      onSelect={() => {
        activeEditor.dispatchCommand(INSERT_EMBED_COMMAND, embedConfig.type)
      }}
      className="cursor-pointer"
    >
      <span className="mr-2">{embedConfig.icon}</span>
      <span>{embedConfig.contentName}</span>
    </DropdownMenuItem>
  ))
}
