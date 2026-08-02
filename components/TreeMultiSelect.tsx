"use client";

import * as React from "react";
import { ChevronRight, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Control, FieldPath, FieldValues } from "react-hook-form";

export interface TreeItem {
  id: string;
  name: string;
  parentId: string | null; // Database uses parent_id, ensure mapping matches
  children?: TreeItem[];
}

interface TreeMultiSelectProps {
  data: any[]; // The raw flat array from Supabase/tRPC
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  label?: string;
}

export function TreeMultiSelect({
  data,
  value,
  onChange,
  placeholder = "Select options...",
}: TreeMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [searchValue, setSearchValue] = React.useState("");

  const treeData = React.useMemo(() => {
    const map = new Map<string, TreeItem>();
    data.forEach((item) => {
      map.set(item.id, {
        id: item.id,
        name: item.name,
        parentId: item.parent_id || item.parentId,
        children: [],
      });
    });

    const roots: TreeItem[] = [];
    map.forEach((item) => {
      if (item.parentId && map.has(item.parentId)) {
        map.get(item.parentId)!.children!.push(item);
      } else {
        roots.push(item);
      }
    });
    return roots;
  }, [data]);

  const toggleValue = (id: string) => {
    const isSelected = value.includes(id);
    let newValue: string[];

    if (isSelected) {
      const idsToRemove = new Set<string>();
      const collectDescendants = (nodeId: string) => {
        idsToRemove.add(nodeId);
        data
          .filter((d) => (d.parent_id || d.parentId) === nodeId)
          .forEach((child) => collectDescendants(child.id));
      };
      collectDescendants(id);
      newValue = value.filter((v) => !idsToRemove.has(v));
    } else {
      const idsToAdd = new Set<string>();
      const collectAncestors = (nodeId: string) => {
        idsToAdd.add(nodeId);
        const item = data.find((d) => d.id === nodeId);
        const pId = item?.parent_id || item?.parentId;
        if (pId) collectAncestors(pId);
      };
      collectAncestors(id);
      newValue = Array.from(new Set([...value, ...idsToAdd]));
    }
    onChange(newValue);
  };

  const renderTree = (items: TreeItem[], level = 0) => {
    return items.map((item) => {
      const hasChildren = item.children && item.children.length > 0;
      const isExpanded = expanded[item.id] || searchValue.length > 0; // Auto-expand on search

      return (
        <React.Fragment key={item.id}>
          <CommandItem
            value={item.name}
            // Passing keywords helps Command find nested items during search
            keywords={[item.name]}
            onSelect={() => toggleValue(item.id)}
            className="p-0 flex items-stretch h-10 overflow-hidden group"
          >
            {/* LEFT ZONE: Selection (85% width) */}
            <div
              className="flex items-center flex-1 gap-2 px-2 hover:bg-slate-50 transition-colors"
              style={{ paddingLeft: `${level * 1.2 + 0.75}rem` }}
            >
              <div className="relative flex items-center h-full">
                {level > 0 && (
                  <div className="absolute -left-3 top-[-20px] bottom-0 w-px bg-slate-200" />
                )}
                <Checkbox checked={value.includes(item.id)} className="z-10" />
              </div>
              <span
                className={cn(
                  "text-sm truncate",
                  level === 0
                    ? "font-bold text-slate-900"
                    : "font-medium text-slate-600",
                  value.includes(item.id) && "text-emerald-600",
                )}
              >
                {item.name}
              </span>
            </div>

            {/* RIGHT ZONE: Toggle (Fixed width) */}
            {hasChildren && (
              <div
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setExpanded((prev) => ({
                    ...prev,
                    [item.id]: !expanded[item.id],
                  }));
                }}
                className="w-16 bg-gray-100 flex items-center justify-center border-l border-transparent group-hover:border-slate-100 hover:bg-slate-100 transition-all cursor-pointer"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
              </div>
            )}
          </CommandItem>

          {isExpanded && hasChildren && renderTree(item.children!, level + 1)}
        </React.Fragment>
      );
    });
  };

  const selectedItems = React.useMemo(() => {
    return data.filter((item) => value.includes(item.id));
  }, [data, value]);

  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-between min-h-11 h-auto px-3 border-slate-200 transition-all",
              open && "ring-2 ring-emerald-500/20 border-emerald-500",
            )}
          >
            <span
              className={cn(
                "text-sm",
                value.length === 0 && "text-muted-foreground",
              )}
            >
              {value.length > 0 ? `${value.length} selected` : placeholder}
            </span>
            <Search className="h-4 w-4 shrink-0 opacity-40 ml-2" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[450px] p-0 shadow-2xl border-slate-200 rounded-xl overflow-hidden bg-white"
          align="start"
        >
          <Command className="rounded-none" shouldFilter={false}>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput
                value={searchValue}
                onValueChange={setSearchValue}
                placeholder="Search..."
                className="border-none focus:ring-0 w-full"
              />
            </div>
            <CommandList className="max-h-[350px] scrollbar-thin">
              <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                No matches found.
              </CommandEmpty>
              <CommandGroup className="p-2">
                {renderTree(treeData)}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
          {selectedItems.map((item) => (
            <Badge
              key={item.id}
              variant="secondary"
              className="pl-2 pr-1 py-1 gap-1 bg-white border-slate-200 text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-100 transition-all cursor-pointer group"
              onClick={() => toggleValue(item.id)}
            >
              <span className="text-[11px] font-medium">{item.name}</span>
              <X className="h-3 w-3 opacity-50 group-hover:opacity-100" />
            </Badge>
          ))}
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[10px] text-muted-foreground underline hover:text-red-500 ml-auto px-2"
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}
type TreeMultiSelectFormProps<T extends FieldValues> = {
  control: Control<T>;
  rawParts: TreeItem[];
  name: FieldPath<T>;
  label: string;
  description?: string;
};
export const TreeMultiSelectForm = <T extends FieldValues>({
  control,
  rawParts,
  name,
  label,
  description,
}: TreeMultiSelectFormProps<T>) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <TreeMultiSelect
            data={rawParts}
            value={field.value}
            onChange={field.onChange}
          />
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
