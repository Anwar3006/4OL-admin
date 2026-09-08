"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dumbbell, Loader2, X } from "lucide-react";
import ImageDropZone from "@/components/ImageDropZone";
import {
  exerciseSchema,
  TExerciseInput,
  CATEGORIES,
  EXERCISE_TYPES,
  EQUIPMENT_TYPES,
  DIFFICULTY_LEVELS,
  EXERCISE_STATUS,
} from "@/schemas/exercise.schema";
import { useAddExerciseDialog } from "@/features/fitness/data/dialog-hooks";
import {
  useCreateExercise,
  useUpdateExercise,
} from "@/features/fitness/data/useExercise";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const RichTextEditor = dynamic(
  () => import("@/components/RichTextInput").then((mod) => mod.RichTextEditor),
  { ssr: false },
);

const AddExerciseDialog = () => {
  const { isOpen, close, data, isEditMode } = useAddExerciseDialog();
  const { mutate: createExercise, isPending: isCreating } = useCreateExercise();
  const { mutate: updateExercise, isPending: isUpdating } = useUpdateExercise();

  const [tagInput, setTagInput] = useState("");
  const isPending = isCreating || isUpdating;

  const defaultValues: TExerciseInput = {
    exercise_name: "",
    category: "strength",
    primary_muscle_group: "Arm",
    secondary_muscles: "",
    equipment_required: "No Equipment",
    difficulty_level: "beginner",
    default_sets: "3",
    default_reps_duration: "12",
    rest_time_seconds: "60",
    description: "",
    benefits: "",
    muscles_worked_raw: "",
    video_url: "",
    thumbnail_url: "",
    tier: "pro",
    is_featured: false,
    is_active: true,
    status: "published",
    tags: [],
  };

  const form = useForm<TExerciseInput>({
    resolver: zodResolver(exerciseSchema),
    defaultValues,
  });

  // Watch necessary values for UI logic
  const tags = form.watch("tags");
  const exerciseName = form.watch("exercise_name");

  // Media uploads for the same exercise share one folder — keyed by
  // exercise_name, mirroring scripts/fitness_media_seeder.ts — so both the
  // admin-uploaded and seeded video/image for an exercise live together,
  // which makes future migration straightforward. Falls back to a flat
  // "fitness/media" bucket while the name is still empty (new exercise).
  const mediaFolder = exerciseName?.trim()
    ? `fitness/media/${exerciseName.trim().replace(/\s+/g, "_")}`
    : "fitness/media";

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && data) {
        form.reset({
          exercise_name: data.exercise_name ?? "",
          category: data.category ?? "Arm",
          primary_muscle_group: data.primary_muscle_group ?? "Arm",
          secondary_muscles: data.secondary_muscles ?? "",
          equipment_required: data.equipment_required ?? "No Equipment",
          difficulty_level: data.difficulty_level ?? "beginner",
          default_sets: data.default_sets ?? "3",
          default_reps_duration: data.default_reps_duration ?? "12",
          rest_time_seconds: data.rest_time_seconds ?? "60",
          description: data.description ?? "",
          benefits: data.benefits ?? "",
          muscles_worked_raw: data.muscles_worked_raw ?? "",
          video_url: data.video_url ?? "",
          thumbnail_url: data.thumbnail_url ?? "",
          tier: data.tier === "free" ? "free" : "pro",
          is_featured: !!data.is_featured,
          is_active: data.is_active !== false,
          status: data.status ?? "published",
          tags: Array.isArray(data.tags) ? data.tags : [],
        });
      } else {
        form.reset(defaultValues);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isEditMode, data]);

  const onSubmit = (values: TExerciseInput) => {
    if (isEditMode && data?.id) {
      updateExercise({ id: data.id, data: values }, { onSuccess: close });
    } else {
      createExercise(values, { onSuccess: close });
    }
  };

  const addTag = () => {
    if (!tagInput.trim()) return;
    const currentTags = form.getValues("tags") || [];
    if (!currentTags.includes(tagInput.trim())) {
      form.setValue("tags", [...currentTags, tagInput.trim()], {
        shouldValidate: true,
      });
    }
    setTagInput("");
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = form.getValues("tags") || [];
    form.setValue(
      "tags",
      currentTags.filter((t) => t !== tagToRemove),
      { shouldValidate: true },
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-3xl overflow-y-auto max-h-[92vh] p-0 border-none shadow-2xl bg-white dark:bg-slate-800">
        <div className="bg-white dark:bg-slate-800 rounded-lg overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b bg-gray-50 dark:bg-gray-900">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Dumbbell className="h-6 w-6 text-primary" />
              {isEditMode ? "Edit Exercise" : "Add Exercise"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="p-6 space-y-6"
            >
              {/* Exercise Name & Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="exercise_name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Exercise Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Barbell Curl" {...field} />
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
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white dark:bg-slate-800 z-[100] shadow-md border">
                          {EXERCISE_STATUS.map((s) => (
                            <SelectItem
                              key={s}
                              value={s}
                              className="capitalize cursor-pointer"
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

              {/* Category & Primary Muscle Group */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white dark:bg-slate-800 z-[100] shadow-md border">
                          {EXERCISE_TYPES.map((type) => (
                            <SelectItem
                              key={type}
                              value={type}
                              className="cursor-pointer capitalize"
                            >
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="primary_muscle_group"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Muscle Group *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select primary muscle" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white dark:bg-slate-800 z-[100] shadow-md border">
                          {CATEGORIES.map((cat) => (
                            <SelectItem
                              key={cat}
                              value={cat}
                              className="cursor-pointer"
                            >
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Secondary Muscles & Equipment Required & Difficulty */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="secondary_muscles"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Secondary Muscles</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Forearms, Brachialis"
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
                  name="equipment_required"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Equipment Required *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Dumbbell, Barbell"
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
                  name="difficulty_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Difficulty</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. beginner, intermediate"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Sets, Reps/Duration & Rest Time */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="default_sets"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Sets</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. 3"
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
                  name="default_reps_duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Reps / Duration</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. 12 or 45s"
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
                  name="rest_time_seconds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rest Time (seconds)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. 60"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Extra Meta Text fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="benefits"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Benefits</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Hypertrophy, Grip strength"
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
                  name="muscles_worked_raw"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Muscles Worked Raw</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Comma separated strings"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Premium, Featured & Active Toggles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="tier"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-white dark:bg-slate-800">
                      <div className="space-y-0.5">
                        <FormLabel>Premium (Pro)</FormLabel>
                        <FormDescription>Gated for pro users</FormDescription>
                      </div>
                      <FormControl>
                        <Button
                          type="button"
                          variant={
                            field.value === "pro" ? "default" : "outline"
                          }
                          size="sm"
                          className={cn(
                            "w-20",
                            field.value === "pro"
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "",
                          )}
                          onClick={() =>
                            field.onChange(
                              field.value === "pro" ? "free" : "pro",
                            )
                          }
                        >
                          {field.value === "pro" ? "Yes" : "No"}
                        </Button>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_featured"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-white dark:bg-slate-800">
                      <div className="space-y-0.5">
                        <FormLabel>Featured</FormLabel>
                        <FormDescription>Promote on dashboard</FormDescription>
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
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-white dark:bg-slate-800">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Visible to client apps
                        </FormDescription>
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
              </div>

              {/* Tags Section */}
              <div className="space-y-3">
                <FormLabel>Tags</FormLabel>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tags..."
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
                  {tags?.map((tag) => (
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

              {/* Video Upload */}
              <FormField
                control={form.control}
                name="video_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Upload Video</FormLabel>
                    <FormControl>
                      <ImageDropZone
                        filePath={mediaFolder}
                        mediaType="video"
                        maxFiles={1}
                        onFilesChange={(urls) => {
                          field.onChange(urls[0] ?? "");
                        }}
                        initialFiles={field.value ? [field.value] : []}
                        text="Upload exercise video"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Thumbnail Upload */}
              <FormField
                control={form.control}
                name="thumbnail_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Upload Thumbnail</FormLabel>
                    <FormControl>
                      <ImageDropZone
                        filePath={mediaFolder}
                        mediaType="image"
                        maxFiles={1}
                        onFilesChange={(urls) => {
                          field.onChange(urls[0] ?? "");
                        }}
                        initialFiles={field.value ? [field.value] : []}
                        text="Upload thumbnail image"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description / How To */}
              <RichTextEditor
                control={form.control}
                name="description"
                label="Description / How To Instructions"
              />

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
                  {isEditMode ? "Update Exercise" : "Create Exercise"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddExerciseDialog;
