"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { MultiSelect } from "@/components/MultiSelect";
import { Bot, Loader2, Sparkles } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAiGeneratePlanDialog } from "@/stores/dialog-store";
import { getBrowserClient } from "@/lib/db/browser";

// ─── Form Schema ──────────────────────────────────────────────────────────────

const aiGeneratePlanSchema = z.object({
  title: z.string().optional(),
  fitness_goals: z.array(z.string()).min(1, "At least one goal is required"),
  fitness_level: z.string().min(1, "Fitness level is required"),
  workout_weeks: z.number().min(1).max(52),
  workout_duration: z.number().min(15).max(120),
  // Removed the separate `equipment` multi-select field. Mobile onboarding
  // only sets `equipment_access` (single choice: no_equipment / basic /
  // full_gym), so an admin plan must mirror that to produce a matching
  // selection_hash and avoid polluting the hash with a value real users
  // never have. Exercise filtering now derives allowed equipment directly
  // from `equipment_access` in features/fitness/data/generate-plan.ts.
  focus_areas: z.array(z.string()),
  workout_locations: z.array(z.string()).min(1, "Select at least one location"),
  workout_types: z.array(z.string()),
  workout_days: z.array(z.string()).min(1, "Select at least one workout day"),
  target_body_shape: z.string().optional(),
  // Required (not optional) so the resulting selection_hash is always
  // computed from a real value — buildSelectionHash treats a blank string
  // the same as "never chosen", which would make an admin-crafted plan's
  // hash match users who genuinely left these unset rather than users who
  // share the admin's intended body_type/equipment_access.
  body_type: z.string().min(1, "Body type is required"),
  equipment_access: z.string().min(1, "Equipment access is required"),
});

type AiGeneratePlanInput = z.infer<typeof aiGeneratePlanSchema>;

// ─── Options ──────────────────────────────────────────────────────────────────

const FITNESS_GOALS = [
  "Weight Loss",
  "Muscle Gain",
  "Strength",
  "Endurance",
  "Flexibility",
  "General Fitness",
];

const FITNESS_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const FOCUS_AREAS = [
  "chest",
  "back",
  "shoulders",
  "arms",
  "core",
  "legs",
  "glutes",
  "full body",
];

const LOCATION_OPTIONS = ["gym", "home", "outdoor"];

const WORKOUT_TYPES = [
  "strength",
  "cardio",
  "hiit",
  "yoga",
  "pilates",
  "crossfit",
  "calisthenics",
];

const WORKOUT_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const BODY_SHAPES = [
  { value: "athletic", label: "Athletic" },
  { value: "lean", label: "Lean" },
  { value: "muscular", label: "Muscular" },
  { value: "toned", label: "Toned" },
  { value: "powerful", label: "Powerful" },
  { value: "balanced", label: "Balanced" },
];

// Mirrors BodyType from 4-Our-Life-App/store/use-fitness-store.ts exactly —
// values must match verbatim for buildSelectionHash to produce the same
// hash as a real user's onboarding selection.
const BODY_TYPES = [
  { value: "ectomorph", label: "Ectomorph (naturally lean)" },
  { value: "mesomorph", label: "Mesomorph (naturally athletic)" },
  { value: "endomorph", label: "Endomorph (naturally stockier)" },
];

// Mirrors EquipmentAccess from the same file — same reasoning.
const EQUIPMENT_ACCESS_OPTIONS = [
  { value: "no_equipment", label: "No Equipment" },
  { value: "basic", label: "Basic (bands / dumbbells)" },
  { value: "full_gym", label: "Full Gym" },
];

// ─── Component ────────────────────────────────────────────────────────────────
// No `trigger` prop — this dialog follows the same Zustand dialog-store
// pattern as every other dialog in this codebase (AddFitnessPlanDialog,
// etc.): rendered once, opened via useAiGeneratePlanDialog().open() from
// a plain button elsewhere. The previous version rendered a shadcn
// <Button> and put the caller's own <button> INSIDE it as children —
// button nested in button, which is invalid HTML and triggers a
// hydration error. It also duplicated the whole dialog tree (mounted
// once with a trigger, once without) since it used local useState
// instead of shared store state.

const AiGeneratePlanDialog = () => {
  const { isOpen, close } = useAiGeneratePlanDialog();
  const queryClient = useQueryClient();
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const getToken = async () => {
      const supabase = getBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setAccessToken(session?.access_token ?? null);
    };

    if (isOpen) {
      getToken();
    }
  }, [isOpen]);

  const form = useForm<AiGeneratePlanInput>({
    resolver: zodResolver(aiGeneratePlanSchema),
    defaultValues: {
      title: "",
      fitness_goals: [],
      fitness_level: "beginner",
      workout_weeks: 4,
      workout_duration: 45,
      focus_areas: [],
      workout_locations: [],
      workout_types: [],
      workout_days: [],
      target_body_shape: "",
      body_type: "",
      equipment_access: "",
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (data: AiGeneratePlanInput) => {
      if (!accessToken) {
        throw new Error("You must be signed in to generate a plan");
      }

      const response = await fetch("/api/fitness/generate-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          selections: data,
          title_override: data.title || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate plan");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fitness-plans"] });
      toast.success("Plan generated successfully!");
      close();
      form.reset();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to generate plan");
    },
  });

  const onSubmit = (data: AiGeneratePlanInput) => {
    generateMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? undefined : close())}>
      <DialogContent className="max-w-3xl overflow-y-auto max-h-[92vh] p-0 border-none shadow-2xl bg-white">
        <div className="bg-white rounded-lg overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b bg-gray-50">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-blue-500" />
              AI Generate Fitness Plan
            </DialogTitle>
            <DialogDescription>
              Configure the plan parameters and let AI create a personalized
              workout program.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="p-6 space-y-6"
            >
              {/* Title Override (Optional) */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Title (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Leave blank for AI-generated title"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Override the AI-generated title or leave blank to use the
                      AI suggestion
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Goals & Level */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fitness_goals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fitness Goals *</FormLabel>
                      <FormControl>
                        <MultiSelect
                          name="fitness_goals"
                          label=""
                          options={FITNESS_GOALS}
                          selected={field.value}
                          onChange={field.onChange}
                          placeholder="Select goals"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fitness_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Difficulty Level *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white z-[100]">
                          {FITNESS_LEVELS.map((level) => (
                            <SelectItem
                              key={level.value}
                              value={level.value}
                              className="capitalize"
                            >
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Duration Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="workout_weeks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (Weeks) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="workout_duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session Duration (Minutes) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Equipment & Locations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="equipment_access"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Equipment Access *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select equipment access" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white z-[100]">
                          {EQUIPMENT_ACCESS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
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
                  name="workout_locations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Workout Locations *</FormLabel>
                      <FormControl>
                        <MultiSelect
                          name="workout_locations"
                          label=""
                          options={LOCATION_OPTIONS}
                          selected={field.value}
                          onChange={field.onChange}
                          placeholder="Select locations"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Focus Areas & Workout Types */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="focus_areas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Focus Areas</FormLabel>
                      <FormControl>
                        <MultiSelect
                          name="focus_areas"
                          label=""
                          options={FOCUS_AREAS}
                          selected={field.value}
                          onChange={field.onChange}
                          placeholder="Select focus areas"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="workout_types"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Workout Types</FormLabel>
                      <FormControl>
                        <MultiSelect
                          name="workout_types"
                          label=""
                          options={WORKOUT_TYPES}
                          selected={field.value}
                          onChange={field.onChange}
                          placeholder="Select types"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Workout Days & Target Body Shape */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="workout_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Workout Days *</FormLabel>
                      <FormControl>
                        <MultiSelect
                          name="workout_days"
                          label=""
                          options={WORKOUT_DAYS}
                          selected={field.value}
                          onChange={field.onChange}
                          placeholder="Select days"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="target_body_shape"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Body Shape</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select shape" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white z-[100]">
                          {BODY_SHAPES.map((shape) => (
                            <SelectItem key={shape.value} value={shape.value}>
                              {shape.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Body Type — collected solely so the computed selection_hash
                  can match a real user's onboarding hash byte-for-byte; not
                  shown to end users beyond this form, just used for AI plan
                  dedup/matching. See buildSelectionHash in
                  features/fitness/data/generate-plan.ts. */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="body_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Body Type *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select body type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white z-[100]">
                          {BODY_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Matches this plan against users with the same onboarding
                        profile instead of generating a duplicate.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={close}
                  disabled={generateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={generateMutation.isPending}
                  className="min-w-[140px]"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Bot className="mr-2 h-4 w-4" />
                      Generate Plan
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AiGeneratePlanDialog;
