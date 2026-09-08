"use client";

import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileCardConfig } from "./mobile-card-types";
import { cn } from "@/lib/utils";

interface MobileCardProps<TData> {
  data: TData;
  config: MobileCardConfig<TData>;
  onClick?: () => void;
}

export const MobileCard = <TData,>({
  data,
  config,
  onClick,
}: MobileCardProps<TData>) => {
  const { header, fields, actions, getId } = config;

  // Get ID for the card
  const cardId = getId ? getId(data) : (data as any).id;

  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-800 w-full border rounded-lg p-4 transition-colors",
        onClick && "hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer active:bg-gray-100",
      )}
      onClick={onClick}
    >
      {/* Header Section */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base truncate text-start">
            {header.title(data)}
          </h3>
          {header.subtitle && (
            <p className="text-sm text-muted-foreground text-start">
              {header.subtitle(data)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 ml-2">
          {/* Badge (e.g., status) */}
          {header.badge && header.badge(data)}

          {/* Actions Dropdown */}
          {actions && actions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  aria-label="Open actions menu"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                {actions.map((action, index) => (
                  <div key={`${cardId}-action-${index}`}>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        action.onClick(data, e);
                      }}
                      className={cn(
                        action.destructive && "text-red-600 dark:text-red-400 focus:text-red-600",
                      )}
                    >
                      {action.label}
                    </DropdownMenuItem>
                    {action.separator && <DropdownMenuSeparator />}
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Fields Section */}
      <div className="space-y-2 text-sm">
        {fields.map((field) => (
          <div
            key={field.id}
            className={cn(
              "flex items-center gap-2",
              field.className || "text-muted-foreground",
            )}
          >
            {field.icon && <span className="shrink-0">{field.icon}</span>}
            <div className="flex justify-between truncate">
              {field.label && (
                <span className="text-xs text-muted-foreground mr-2">
                  {field.label}:
                </span>
              )}
              {field.render(data)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
