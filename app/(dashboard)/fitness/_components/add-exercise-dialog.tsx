"use client";

import React, { useEffect, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Dumbbell, Loader2, Star, Tag } from "lucide-react";
import ImageDropZone from "@/components/ImageDropZone";
import { RichTextEditor } from "@/components/RichTextInput";
import {
  exerciseSchema,
  TExerciseInput,
  BODY_PARTS,
  EQUIPMENT_TYPES,
  DIFFICULTY_LEVELS,
  EXERCISE_STATUS,
} from "@/schemas/exercise.schema";
import { useAddExerciseDialog } from "@/stores/dialog-store";
import {
  useCreateExercise,
  useUpdateExercise,
} from "@/hooks/supabase-calls/useExercise";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

// ── Star Rating Component ────────────────────────────────────────────────────
const StarRating = ({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered ?? value ?? 0;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const star = i + 1;
        return (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onChange(star === value ? 0 : star)}
            className="focus:outline-none"
            aria-label={`Set intensity ${star}`}
          >
            <Star
              className={`h-7 w-7 transition-colors ${
                star <= active
                  ? "fill-amber-400 text-amber-400"
                  : "text-gray-300 fill-gray-100"
              }`}
            />
          </button>
        );
      })}
      {value ? (
        <span className="ml-2 text-sm text-muted-foreground">
          {value} / 5
        </span>
      ) : null}
    </div>
  );
};

// ── Main Dialog ──────────────────────────────────────────────────────────────
const AddExerciseDialog = () => {
  const { isOpen, close, data, isEditMode } = useAddExerciseDialog();
  const { mutate: createExercise, isPending: isCreating } = useCreateExercise();
  const { mutate: updateExercise, isPending: isUpdating } = useUpdateExercise();

  const [tagInput, setTagInput] = useState("");

  const isPending = isCreating || isUpdating;

  const defaultValues: TExerciseInput = {
    exercise_name: "",
    primary_body_part: "Arm",
    secondary_body_part: null,
    equipment_type: "No Equipment",
    intensity: null,
    difficulty_level: "beginner",
    status: "published",
    duration_minutes: 10,
    calories_burned: 0,
    video_url: "",
    thumbnail_urls: [],
    how_to: "",
    tags: [],
    is_premium: false,
    is_active: true,
  };

  const form = useForm<TExerciseInput>({
    resolver: zodResolver(exerciseSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isOpen && isEditMode && data) {
      form.reset({
        ...data,
        video_url: data.video_url ?? "",
        how_to: data.how_to ?? "",
        tags: data.tags ?? [],
      });
    } else if (isOpen) {
      form.reset(defaultValues);
    }
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
      form.setValue("tags", [...currentTags, tagInput.trim()]);
    }
    setTagInput("");
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = form.getValues("tags") || [];
    form.setValue("tags", currentTags.filter(t => t !== tagToRemove));
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-3xl overflow-y-auto max-h-[92vh] p-0 border-none shadow-2xl">
        <div className="bg-white rounded-lg overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b bg-gray-50">
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
                      <FormLabel>Exercise Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Barbell Curl"
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
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EXERCISE_STATUS.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">
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

              {/* Body Parts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="primary_body_part"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Primary Body Part{" "}
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select primary body part" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {BODY_PARTS.map((bp) => (
                            <SelectItem key={bp} value={bp}>
                              {bp}
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
                  name="secondary_body_part"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Secondary Body Part</FormLabel>
                      <Select
                        onValueChange={(val) =>
                          field.onChange(val === "none" ? null : val)
                        }
                        value={field.value ?? "none"}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select secondary body part" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {BODY_PARTS.map((bp) => (
                            <SelectItem key={bp} value={bp}>
                              {bp}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="equipment_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Equipment Type <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select equipment" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EQUIPMENT_TYPES.map((eq) => (
                            <SelectItem key={eq} value={eq}>
                              {eq}
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
                  name="difficulty_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Difficulty</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DIFFICULTY_LEVELS.map((level) => (
                            <SelectItem key={level} value={level} className="capitalize">
                              {level}
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
                  name="intensity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Intensity</FormLabel>
                      <FormControl>
                        <StarRating
                          value={field.value ?? null}
                          onChange={(v) => field.onChange(v || null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="duration_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (mins)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="calories_burned"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Est. Calories</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_premium"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-6">
                      <div className="space-y-0.5">
                        <FormLabel>Premium</FormLabel>
                        <FormDescription>Gated for pro users</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Tags */}
              <div className="space-y-3">
                <FormLabel>Tags</FormLabel>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Add tags..." 
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" variant="outline" onClick={addTag}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.watch("tags")?.map(tag => (
                    <Badge key={tag} variant="secondary" className="gap-1 pl-2.5">
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
                        filePath="fitness/media"
                        mediaType="video"
                        maxFiles={1}
                        onFilesChange={(urls) => field.onChange(urls[0] ?? "")}
                        initialFiles={field.value ? [field.value] : []}
                        text="Upload exercise video"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Thumbnails */}
              <FormField
                control={form.control}
                name="thumbnail_urls"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Upload Thumbnails</FormLabel>
                    <FormControl>
                      <ImageDropZone
                        filePath="fitness/media"
                        onFilesChange={(urls) => field.onChange(urls)}
                        initialFiles={field.value ?? []}
                        text="Upload thumbnails"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* How To */}
              <RichTextEditor
                control={form.control}
                name="how_to"
                label="How To"
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
