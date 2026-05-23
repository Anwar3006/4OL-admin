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
import { ClipboardList, Loader2, Star, Target, Layers } from "lucide-react";
import { MultiSelect } from "@/components/MultiSelect";
import {
  workoutPlanSchema,
  TWorkoutPlanInput,
} from "@/schemas/workout-plan.schema";
import { BODY_PARTS } from "@/schemas/workout.schema";
import { useAddWorkoutPlanDialog } from "@/stores/dialog-store";
import {
  useCreateWorkoutPlan,
  useUpdateWorkoutPlan,
} from "@/hooks/supabase-calls/useWorkoutPlan";
import { Textarea } from "@/components/ui/textarea";

const AddWorkoutPlanDialog = () => {
  const { isOpen, close, data, isEditMode } = useAddWorkoutPlanDialog();
  const { mutate: createPlan, isPending: isCreating } = useCreateWorkoutPlan();
  const { mutate: updatePlan, isPending: isUpdating } = useUpdateWorkoutPlan();

  const isPending = isCreating || isUpdating;

  const defaultValues: TWorkoutPlanInput = {
    title: "",
    description: "",
    difficulty_level: "beginner",
    duration_weeks: 4,
    workouts_per_week: 3,
    target_body_parts: [],
    goals: [],
    is_premium: false,
    is_featured: false,
    status: "published",
    author_type: "admin",
    tags: [],
  };

  const form = useForm<TWorkoutPlanInput>({
    resolver: zodResolver(workoutPlanSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isOpen && isEditMode && data) {
      form.reset(data);
    } else if (isOpen) {
      form.reset(defaultValues);
    }
  }, [isOpen, isEditMode, data]);

  const onSubmit = (values: TWorkoutPlanInput) => {
    if (isEditMode && data?.id) {
      updatePlan({ id: data.id, data: values }, { onSuccess: close });
    } else {
      createPlan(values, { onSuccess: close });
    }
  };

  const bodyPartOptions = [...BODY_PARTS];
  const goalOptions = [
    "Weight Loss",
    "Muscle Gain",
    "Strength",
    "Endurance",
    "Flexibility",
  ];

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-3xl overflow-y-auto max-h-[92vh] p-0 border-none shadow-2xl">
        <div className="bg-white rounded-lg overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b bg-gray-50">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-primary" />
              {isEditMode ? "Edit Workout Plan" : "Create Workout Plan"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="p-6 space-y-6"
            >
              {/* Title & Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Plan Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 4 Week Shred" {...field} />
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
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the plan and its benefits..." 
                        className="resize-none h-24"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Structure */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="duration_weeks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (Weeks)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="workouts_per_week"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Workouts / Week</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                          <SelectItem value="expert">Expert</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="target_body_parts"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <MultiSelect
                          name="target_body_parts"
                          label="Target Body Parts"
                          options={bodyPartOptions}
                          selected={field.value}
                          onChange={field.onChange}
                          placeholder="Select body parts"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="goals"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <MultiSelect
                          name="goals"
                          label="Plan Goals"
                          options={goalOptions}
                          selected={field.value}
                          onChange={field.onChange}
                          placeholder="Select goals"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="is_premium"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Premium Plan</FormLabel>
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

                <FormField
                  control={form.control}
                  name="is_featured"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Featured</FormLabel>
                        <FormDescription>Highlight on home screen</FormDescription>
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
                  {isEditMode ? "Update Plan" : "Create Plan"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddWorkoutPlanDialog;
