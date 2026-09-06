"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Building2,
  Briefcase,
  Dumbbell,
  HeartPulse,
  HelpCircle,
  Loader2,
  Salad,
  Search,
  User,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useDialogStore, DialogTypes } from "@/stores/dialog-store";

type SearchResult = {
  entity_type:
    | "condition"
    | "symptom"
    | "facility"
    | "user"
    | "job"
    | "faq"
    | "healthy_living"
    | "exercise";
  entity_id: string;
  title: string;
  subtitle: string | null;
  href: string;
  rank: number | null;
};

const ENTITY_META: Record<
  SearchResult["entity_type"],
  { label: string; icon: React.ElementType }
> = {
  condition: { label: "Diseases & Conditions", icon: Activity },
  symptom: { label: "Symptoms", icon: HeartPulse },
  facility: { label: "Facilities", icon: Building2 },
  user: { label: "Users", icon: User },
  job: { label: "Jobs", icon: Briefcase },
  faq: { label: "FAQ", icon: HelpCircle },
  healthy_living: { label: "Healthy Living", icon: Salad },
  exercise: { label: "Fitness", icon: Dumbbell },
};

// Where each entity type's list page lives, and which dialog-store entry
// (if any) its view dialog is registered under. Dialogs are opened via the
// global Zustand store directly (not the typed hooks) since this fires from
// an event handler, not a render — the store persists across navigation, so
// it doesn't matter whether we open it before or after router.push().
const ENTITY_ROUTE: Record<
  SearchResult["entity_type"],
  { path: string; dialog?: DialogTypes }
> = {
  condition: { path: "/diseases", dialog: "view-condition" },
  // Symptoms page reuses the "view-condition" store key for its own dialog.
  symptom: { path: "/symptoms", dialog: "view-condition" },
  facility: { path: "/facilities", dialog: "view-facility" },
  user: { path: "/users", dialog: "view-user" },
  exercise: { path: "/fitness?tab=exercises", dialog: "view-exercise" },
  healthy_living: { path: "/healthy-living", dialog: "view-healthy-living" },
  // No view dialog exists yet for these — land on the list page only.
  job: { path: "/jobs" },
  faq: { path: "/faq" },
};

interface AdminSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AdminSearchDialog({
  open,
  onOpenChange,
}: AdminSearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const currentRequestId = ++requestIdRef.current;

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/search?q=${encodeURIComponent(term)}`,
        );
        const json = await res.json();
        if (currentRequestId === requestIdRef.current) {
          setResults(json.results ?? []);
        }
      } catch (err) {
        console.error("[AdminSearchDialog] search failed:", err);
        if (currentRequestId === requestIdRef.current) setResults([]);
      } finally {
        if (currentRequestId === requestIdRef.current) setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelect = useCallback(
    (item: SearchResult) => {
      onOpenChange(false);

      const route = ENTITY_ROUTE[item.entity_type];
      if (route?.dialog) {
        useDialogStore
          .getState()
          .openDialog(route.dialog, { entityId: item.entity_id });
      }

      router.push(route?.path ?? item.href);
    },
    [onOpenChange, router],
  );

  // Group results by entity type, preserving the order they came back in.
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.entity_type] ??= []).push(r);
    return acc;
  }, {});

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      description="Search across users, facilities, conditions, symptoms, and more"
      className="max-w-2xl!"
    >
      <CommandInput
        placeholder="Search users, facilities, conditions, jobs..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {loading && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Searching...
          </div>
        )}

        {!loading && query.trim().length >= 2 && results.length === 0 && (
          <CommandEmpty>No results for &ldquo;{query}&rdquo;</CommandEmpty>
        )}

        {!loading && query.trim().length < 2 && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Search className="size-4" />
            Type at least 2 characters to search
          </div>
        )}

        {!loading &&
          Object.entries(grouped).map(([type, items]) => {
            const meta = ENTITY_META[type as SearchResult["entity_type"]];
            const Icon = meta?.icon ?? Search;
            return (
              <CommandGroup key={type} heading={meta?.label ?? type}>
                {items.map((item) => (
                  <CommandItem
                    key={`${item.entity_type}-${item.entity_id}`}
                    value={`${item.entity_type}-${item.entity_id}-${item.title}`}
                    onSelect={() => handleSelect(item)}
                  >
                    <Icon className="text-muted-foreground" />
                    <div className="flex flex-col overflow-hidden">
                      <span className="truncate">{item.title}</span>
                      {item.subtitle && (
                        <span className="truncate text-xs text-muted-foreground">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
      </CommandList>
    </CommandDialog>
  );
}
