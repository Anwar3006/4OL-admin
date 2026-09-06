"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { ClipboardList, Loader2 } from "lucide-react";
import { MultiSelect } from "@/components/MultiSelect";
import {
  fitnessPlanSchema,
  TFitnessPlanInput,
  PLAN_STATUS,
  PLAN_DIFFICULTY,
} from "@/schemas/fitness-plan.schema";
import { CATEGORIES } from "@/schemas/exercise.schema";
import { useAddFitnessPlanDialog } from "@/features/fitness/data/dialog-hooks";
import {
  useCreateFitnessPlan,
  useUpdateFitnessPlan,
} from "@/features/fitness/data/useFitnessPlan";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const AddFitnessPlanDialog = () => {
  const { isOpen, close, data, isEditMode } = useAddFitnessPlanDialog();
  const { mutate: createPlan, isPending: isCreating } = useCreateFitnessPlan();
  const { mutate: updatePlan, isPending: isUpdating } = useUpdateFitnessPlan();

  const isPending = isCreating || isUpdating;

  const defaultValues: TFitnessPlanInput = {
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
    coach_display_name: "",
    tags: [],
  };

  const form = useForm<TFitnessPlanInput>({
    resolver: zodResolver(fitnessPlanSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isOpen && isEditMode && data) {
      form.reset({
        ...data,
        description: data.description ?? "",
        target_body_parts: data.target_body_parts ?? [],
        goals: data.goals ?? [],
        tags: data.tags ?? [],
      });
    } else if (isOpen) {
      form.reset(defaultValues);
    }
  }, [isOpen, isEditMode, data]);

  const onSubmit = (values: TFitnessPlanInput) => {
    // Store an empty coach name as NULL so the mobile grid falls back to
    // the default attribution copy.
    values.coach_display_name = values.coach_display_name?.trim() || null;
    if (isEditMode && data?.id) {
      updatePlan({ id: data.id, data: values }, { onSuccess: close });
    } else {
      createPlan(values, { onSuccess: close });
    }
  };

  const bodyPartOptions = [...CATEGORIES];
  const goalOptions = [
    "Weight Loss",
    "Muscle Gain",
    "Strength",
    "Endurance",
    "Flexibility",
  ];

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-3xl overflow-y-auto max-h-[92vh] p-0 border-none shadow-2xl bg-white">
        <div className="bg-white rounded-lg overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b bg-gray-50">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-primary" />
              {isEditMode ? "Edit Fitness Plan" : "Create Fitness Plan"}
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
                      <FormLabel>Plan Title *</FormLabel>
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
                      <FormLabel>Status *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                        </FormControl>
                        {/*bg-white z-50 overrides default transparent layout artifacts inside Dialogs */}
                        <SelectContent className="bg-white z-[100]">
                          {PLAN_STATUS.map((status) => (
                            <SelectItem key={status} value={status} className="capitalize">
                              {status}
                            </SelectItem>
                          ))}
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
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Coach attribution — public display name, never the admin's
                  real account name (FITNESS_MOCKUP_GAP_ANALYSIS.md, D7) */}
              <FormField
                control={form.control}
                name="coach_display_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coach Display Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Coach Ama"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Shown as &quot;by &lt;name&gt;&quot; on the mobile Generated For You
                      grid. This is a public alias — never your real name.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Structure Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="duration_weeks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (Weeks) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={e => field.onChange(parseInt(e.target.value) || 0)} 
                        />
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
                      <FormLabel>Workouts / Week *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={e => field.onChange(parseInt(e.target.value) || 0)} 
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
                      <FormLabel>Difficulty *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white z-[100]">
                          {PLAN_DIFFICULTY.map((level) => (
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

              {/* Premium and Featured Toggles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="is_premium"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-white">
                      <div className="space-y-0.5">
                        <FormLabel>Premium Plan</FormLabel>
                        <FormDescription>Gated for pro users</FormDescription>
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
                              : ""
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
                  name="is_featured"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-white">
                      <div className="space-y-0.5">
                        <FormLabel>Featured</FormLabel>
                        <FormDescription>Highlight on home screen</FormDescription>
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
                              : ""
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

export default AddFitnessPlanDialog;