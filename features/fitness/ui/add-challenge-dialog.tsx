"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAddChallengeDialog } from "@/features/fitness/data/dialog-hooks";
import {
  challengeSchema,
  TChallengeInput,
  CHALLENGE_STATUS,
} from "@/schemas/challenge.schema";
import {
  useCreateChallenge,
  useUpdateChallenge,
} from "@/features/fitness/data/useChallenge";
import { Loader2, Trophy, X } from "lucide-react";
import ImageDropZone from "@/components/ImageDropZone";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Helper function to reliably output native input format values (YYYY-MM-DD)
const formatDateString = (dateVal: any) => {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
};

const AddChallengeDialog = () => {
  const { isOpen, close, data, isEditMode } = useAddChallengeDialog();
  const { mutate: createChallenge, isPending: isCreating } =
    useCreateChallenge();
  const { mutate: updateChallenge, isPending: isUpdating } =
    useUpdateChallenge();

  const [tagInput, setTagInput] = useState("");
  const [rewardCatalog, setRewardCatalog] = useState<Array<{
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    icon: string;
    value: string | null;
    amount: number | null;
    currency: string | null;
  }>>([]);
  const isPending = isCreating || isUpdating;

  const defaultValues: Partial<TChallengeInput> = {
    title: "",
    description: "",
    challenge_type: "Weight Loss",
    start_date: new Date(),
    end_date: new Date(),
    goal_metric: "steps",
    goal_value: 10000,
    reward_id: null,
    reward_description: "",
    reward_image_url: "",
    status: "draft",
    is_public: true,
    max_participants: null,
    featured_image_url: "",
    tags: [],
  };

  const form = useForm<TChallengeInput>({
    resolver: zodResolver(challengeSchema),
    defaultValues: defaultValues as TChallengeInput,
  });

  useEffect(() => {
    if (isOpen && isEditMode && data) {
      form.reset({
        ...data,
        start_date: data.start_date ? new Date(data.start_date) : new Date(),
        end_date: data.end_date ? new Date(data.end_date) : new Date(),
        description: data.description ?? "",
        reward_id: data.reward_id ?? null,
        reward_description: data.reward_description ?? "",
        reward_image_url: data.reward_image_url ?? "",
        featured_image_url: data.featured_image_url ?? "",
        tags: data.tags ?? [],
      });
    } else if (isOpen) {
      form.reset(defaultValues as TChallengeInput);
    }
  }, [isOpen, isEditMode, data]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void fetch("/api/rewards", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load rewards");
        if (!cancelled) {
          setRewardCatalog(
            (payload.rewards ?? []).filter((reward: { is_active: boolean }) => reward.is_active),
          );
        }
      })
      .catch((error) => {
        if (!cancelled) toast.error((error as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const onSubmit = (values: TChallengeInput) => {
    if (isEditMode && data?.id) {
      updateChallenge({ id: data.id, data: values }, { onSuccess: close });
    } else {
      createChallenge(values, { onSuccess: close });
    }
  };

  const addTag = () => {
    if (!tagInput.trim()) return;
    const currentTags = form.getValues("tags") || [];
    if (!currentTags.includes(tagInput.trim())) {
      form.setValue("tags", [...currentTags, tagInput.trim()]);
    }
    setTagInput("");
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = form.getValues("tags") || [];
    form.setValue(
      "tags",
      currentTags.filter((t) => t !== tagToRemove),
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-3xl overflow-y-auto max-h-[92vh] p-0 border-none shadow-2xl bg-white dark:bg-slate-800">
        <div className="bg-white dark:bg-slate-800 rounded-lg overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b bg-gray-50 dark:bg-gray-900">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              {isEditMode ? "Edit Fitness Challenge" : "Launch New Challenge"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="p-6 space-y-6"
            >
              <FormField
                control={form.control}
                name="reward_id"
                render={({ field }) => (
                  <FormItem className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
                    <FormLabel>Reusable Reward</FormLabel>
                    <Select
                      value={field.value ?? "none"}
                      onValueChange={(value) => {
                        if (value === "none") {
                          field.onChange(null);
                          return;
                        }
                        const reward = rewardCatalog.find((item) => item.id === value);
                        field.onChange(value);
                        if (reward) {
                          const displayValue = reward.amount !== null
                            ? `${reward.currency ?? "GHS"} ${Number(reward.amount).toLocaleString()}`
                            : reward.value;
                          form.setValue(
                            "reward_description",
                            [reward.name, displayValue].filter(Boolean).join(" — "),
                          );
                          form.setValue("reward_image_url", reward.image_url ?? "");
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white dark:bg-slate-900">
                          <SelectValue placeholder="Select from the shared rewards catalogue" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="z-[100] bg-white dark:bg-slate-800">
                        <SelectItem value="none">No reward</SelectItem>
                        {rewardCatalog.map((reward) => (
                          <SelectItem key={reward.id} value={reward.id}>
                            {reward.icon} {reward.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Every active reward is available here, including rewards first created for Trivia.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Media Zones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="featured_image_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Main Cover Image</FormLabel>
                      <FormControl>
                        <ImageDropZone
                          filePath="challenges"
                          onFilesChange={(urls) =>
                            field.onChange(urls?.[0] || "")
                          }
                          initialFiles={field.value ? [field.value] : []}
                          text="Upload cover image"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reward_image_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reward Badge/Image</FormLabel>
                      <FormControl>
                        <ImageDropZone
                          filePath="challenges/rewards"
                          onFilesChange={(urls) =>
                            field.onChange(urls?.[0] || "")
                          }
                          initialFiles={field.value ? [field.value] : []}
                          text="Upload reward image"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Title & Status Setup */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Challenge Title *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Summer Shred 2026"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                        </FormControl>
                        {/*bg-white and explicit layer definitions protect from transparent dropdown bleed */}
                        <SelectContent className="bg-white dark:bg-slate-800 z-[100]">
                          {CHALLENGE_STATUS.map((s) => (
                            <SelectItem
                              key={s}
                              value={s}
                              className="capitalize"
                            >
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Metadata Rules */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="challenge_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Weight Loss" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="goal_metric"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Goal Metric</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. calories, steps"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="goal_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Goal Value</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseFloat(e.target.value)
                                : null,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Dates Sync */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date *</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={formatDateString(field.value)}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? new Date(e.target.value) : "",
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date *</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={formatDateString(field.value)}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? new Date(e.target.value) : "",
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Content Descriptions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Detailed Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Challenge rules and motivation..."
                          className="min-h-[120px] resize-none"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reward_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reward Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="What do participants win?"
                          className="min-h-[120px] resize-none"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Visibility and caps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="is_public"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-white dark:bg-slate-800">
                      <div className="space-y-0.5">
                        <FormLabel>Public Challenge</FormLabel>
                        <FormDescription>Visible to all users</FormDescription>
                      </div>
                      <FormControl>
                        <Button
                          type="button"
                          variant={field.value ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "w-20",
                            field.value
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "",
                          )}
                          onClick={() => field.onChange(!field.value)}
                        >
                          {field.value ? "Yes" : "No"}
                        </Button>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_participants"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Participants</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Unlimited"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseInt(e.target.value) : null,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Tag Management */}
              <div className="space-y-3">
                <FormLabel>Challenge Tags</FormLabel>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. nutrition, cardio"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addTag())
                    }
                  />
                  <Button type="button" variant="outline" onClick={addTag}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.watch("tags")?.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="gap-1 pl-2.5"
                    >
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <DialogFooter className="pt-4 border-t">
                <Button type="button" variant="outline" onClick={close}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="min-w-[140px]"
                >
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isEditMode ? "Update Challenge" : "Start Challenge"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddChallengeDialog;
