"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  topRatedItemSchema,
  TTopRatedItemInput,
  TOP_RATED_MODULES,
} from "@/schemas/top-rated.schema";
import { useAddTopRatedItemDialog } from "@/stores/dialog-store";
import { useUpsertTopRatedItem } from "@/hooks/supabase-calls/useTopRatedItems";
import { Search, Loader2, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";

interface SearchResult {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  rating_average: number | null;
  rating_count: number | null;
}

const AddTopRatedItemDialog = () => {
  const { isOpen, close } = useAddTopRatedItemDialog();
  const { mutate: upsertItem, isPending } = useUpsertTopRatedItem();
  const { data: session } = useSupabaseSession();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);
  const [module, setModule] = useState<string>("facility");

  const form = useForm<TTopRatedItemInput>({
    resolver: zodResolver(topRatedItemSchema),
    defaultValues: {
      module: "facility",
      item_id: "",
      title: "",
      subtitle: "",
      image_url: null,
      rating: undefined,
      rating_count: undefined,
      source: "manual",
      rank: undefined,
      publish_from: undefined,
      expire_at: undefined,
    },
  });

  // Search for items when search term or module changes
  const { data: searchResults, isLoading: isSearching } = useQuery<
    SearchResult[]
  >({
    queryKey: ["search-top-rated-items", module, searchTerm],
    queryFn: async () => {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase.rpc("search_top_rated_items", {
        p_table_name: module,
        p_search_term: searchTerm.trim() || null,
        p_page: 1,
        p_limit: 15,
      });

      if (error) throw error;
      return data || [];
    },
    enabled: isOpen && !!module,
  });

  // Auto-fill form when item is selected
  useEffect(() => {
    if (selectedItem) {
      form.setValue("item_id", selectedItem.id);
      form.setValue("title", selectedItem.title);
      form.setValue("subtitle", selectedItem.subtitle || "");
      form.setValue("image_url", selectedItem.image_url || null);
      form.setValue("rating", selectedItem.rating_average || undefined);
      form.setValue("rating_count", selectedItem.rating_count || undefined);
    }
  }, [selectedItem, form]);

  const onSubmit = (values: TTopRatedItemInput) => {
    if (!selectedItem) return;

    upsertItem(
      {
        module: module as any,
        item_id: selectedItem.id,
        title: selectedItem.title,
        subtitle: selectedItem.subtitle || "",
        image_url: selectedItem.image_url?.trim() || null,
        rating: selectedItem.rating_average || undefined,
        rating_count: selectedItem.rating_count || undefined,
        source: "manual",
        admin_id: session?.user?.id || "",
        // Gap Analysis T-D2 — optional placement window (lazy expiry).
        publish_from: values.publish_from
          ? new Date(values.publish_from).toISOString()
          : null,
        expire_at: values.expire_at
          ? new Date(values.expire_at).toISOString()
          : null,
      },
      {
        onSuccess: () => {
          close();
          form.reset();
          setSearchTerm("");
          setSelectedItem(null);
        },
      },
    );
  };

  const handleModuleChange = (value: string) => {
    setModule(value);
    setSearchTerm("");
    setSelectedItem(null);
    form.setValue("module", value as any);
    form.resetField("item_id");
    form.resetField("title");
    form.resetField("subtitle");
  };

  const handleSelectResult = (item: SearchResult) => {
    setSelectedItem(item);
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-xl overflow-y-auto max-h-[90vh] p-0 border-none shadow-2xl bg-white">
        <div className="bg-white rounded-lg overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b bg-gray-50">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Search className="h-6 w-6 text-primary" />
              Add Top Rated Item
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="p-6 space-y-6"
            >
              {/* Module Selection */}
              <FormField
                control={form.control}
                name="module"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Module *</FormLabel>
                    <Select
                      onValueChange={handleModuleChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select module" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white z-[100] shadow-md border">
                        {TOP_RATED_MODULES.map((m) => (
                          <SelectItem
                            key={m}
                            value={m}
                            className="cursor-pointer capitalize"
                          >
                            {m.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Search Input */}
              <div className="space-y-2">
                <FormLabel className="font-semibold">Search Item</FormLabel>
                <div className="relative">
                  <Input
                    placeholder="Search by name or area..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                  )}
                </div>
              </div>

              {/* Search Results */}
              <div className="space-y-2">
                <FormLabel className="font-semibold text-xs text-slate-500 uppercase tracking-wider">
                  Select Item ({searchResults?.length || 0})
                </FormLabel>
                {searchResults && searchResults.length > 0 ? (
                  <div className="border border-slate-200 rounded-lg max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {searchResults.map((item) => {
                      const isSelected = selectedItem?.id === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`w-full p-3.5 text-left flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-emerald-50 text-emerald-900 font-semibold"
                              : "hover:bg-slate-50 text-slate-800"
                          }`}
                          onClick={() => handleSelectResult(item)}
                        >
                          <div>
                            <div className="text-sm font-medium">
                              {item.title}
                            </div>
                            {item.subtitle && (
                              <div className="text-xs text-slate-500 mt-0.5">
                                {item.subtitle}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <Check className="h-5 w-5 text-emerald-600 flex-shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : !isSearching ? (
                  <div className="border border-dashed border-slate-200 rounded-lg p-6 text-center text-slate-400 text-sm">
                    {searchTerm
                      ? "No records found matching search"
                      : "Start typing to search or choose a module"}
                  </div>
                ) : null}
              </div>

              {/* Placement Window (optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="publish_from"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-xs">
                        Publish From
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          value={field.value || ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                        />
                      </FormControl>
                      <p className="text-[10px] text-slate-400">
                        Leave empty to publish immediately
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expire_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-xs">
                        Expire At
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          value={field.value || ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                        />
                      </FormControl>
                      <p className="text-[10px] text-slate-400">
                        Leave empty for no expiry
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="pt-4 border-t">
                <Button type="button" variant="outline" onClick={close}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || !selectedItem}
                  className="min-w-[140px]"
                >
                  {isPending ? "Saving..." : "Add to Top Rated"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddTopRatedItemDialog;
