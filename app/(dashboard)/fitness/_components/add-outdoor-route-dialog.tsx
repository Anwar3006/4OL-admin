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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Loader2 } from "lucide-react";
import ImageDropZone from "@/components/ImageDropZone";
import { UserSearchSelect } from "./user-search-select";
import {
  fitnessOutdoorRouteSchema,
  TFitnessOutdoorRouteInput,
  DIFFICULTY_LEVELS,
  MODERATION_STATUS,
} from "@/schemas/fitness-outdoor.schema";
import { useAddOutdoorRouteDialog } from "@/stores/dialog-store";
import {
  useCreateFitnessOutdoorRoute,
  useUpdateFitnessOutdoorRoute,
} from "@/hooks/supabase-calls/useFitnessOutdoor";
import { cn } from "@/lib/utils";

const AddOutdoorRouteDialog = () => {
  const { isOpen, close, data, isEditMode } = useAddOutdoorRouteDialog();
  const { mutate: createRoute, isPending: isCreating } = useCreateFitnessOutdoorRoute();
  const { mutate: updateRoute, isPending: isUpdating } = useUpdateFitnessOutdoorRoute();

  const isPending = isCreating || isUpdating;

  const defaultValues: TFitnessOutdoorRouteInput = {
    name: "",
    description: "",
    category: "",
    difficulty: "low",
    surface_type: "",
    gps_data: null,
    start_location_name: "",
    distance_km: null,
    estimated_duration_mins: null,
    verification_status: "pending_review",
    verified_by: null,
    image_urls: [],
    is_active: true,
    created_by: null,
  };

  const form = useForm<TFitnessOutdoorRouteInput>({
    resolver: zodResolver(fitnessOutdoorRouteSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && data) {
        form.reset({
          name: data.name ?? "",
          description: data.description ?? "",
          category: data.category ?? "",
          difficulty: data.difficulty ?? "low",
          surface_type: data.surface_type ?? "",
          gps_data: data.gps_data ?? null,
          start_location_name: data.start_location_name ?? "",
          distance_km: data.distance_km ?? null,
          estimated_duration_mins: data.estimated_duration_mins ?? null,
          verification_status: data.verification_status ?? "pending_review",
          verified_by: data.verified_by ?? null,
          image_urls: Array.isArray(data.image_urls) ? data.image_urls : [],
          is_active: data.is_active !== false,
          created_by: data.created_by ?? null,
        });
      } else {
        form.reset(defaultValues);
      }
    }
  }, [isOpen, isEditMode, data]);

  const onSubmit = (values: TFitnessOutdoorRouteInput) => {
    if (isEditMode && data?.id) {
      updateRoute({ id: data.id, data: values }, { onSuccess: close });
    } else {
      createRoute(values, { onSuccess: close });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-3xl overflow-y-auto max-h-[92vh] p-0 border-none shadow-2xl bg-white">
        <div className="bg-white rounded-lg overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b bg-gray-50">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-slate-800">
              <MapPin className="h-6 w-6 text-emerald-600" />
              {isEditMode ? "Edit Outdoor Route" : "Add Outdoor Route"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6 bg-white">
              
              {/* Route Name & Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-semibold">Route Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. Forest Trail Loop" 
                          readOnly={false} 
                          className="bg-white border-slate-200 focus:border-emerald-500 rounded-xl"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-semibold">Category *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. Hiking, Running, Cycling" 
                          readOnly={false} 
                          className="bg-white border-slate-200 focus:border-emerald-500 rounded-xl"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Difficulty & Verification Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="difficulty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-semibold">Difficulty Level *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white border-slate-200 focus:border-emerald-500 rounded-xl">
                            <SelectValue placeholder="Select difficulty" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white z-[100] shadow-md border">
                          {DIFFICULTY_LEVELS.map((level) => (
                            <SelectItem key={level} value={level} className="capitalize cursor-pointer">
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
                  name="verification_status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-semibold">Verification Status *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white border-slate-200 focus:border-emerald-500 rounded-xl">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white z-[100] shadow-md border">
                          {MODERATION_STATUS.map((status) => (
                            <SelectItem key={status} value={status} className="capitalize cursor-pointer">
                              {status.replace("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Surface Type & Start Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="surface_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-semibold">Surface Type</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. Gravel, Asphalt, Dirt" 
                          readOnly={false} 
                          className="bg-white border-slate-200 focus:border-emerald-500 rounded-xl"
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
                  name="start_location_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-semibold">Start Location Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. Main Park Entrance Gate A" 
                          readOnly={false} 
                          className="bg-white border-slate-200 focus:border-emerald-500 rounded-xl"
                          {...field} 
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Distance & Duration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="distance_km"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-semibold">Distance (km)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="e.g. 5.25" 
                          readOnly={false} 
                          className="bg-white border-slate-200 focus:border-emerald-500 rounded-xl"
                          {...field} 
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estimated_duration_mins"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-semibold">Est. Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="e.g. 45" 
                          readOnly={false} 
                          className="bg-white border-slate-200 focus:border-emerald-500 rounded-xl"
                          {...field} 
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Users Selects */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="created_by"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-semibold">Created By</FormLabel>
                      <FormControl>
                        <UserSearchSelect 
                          value={field.value ?? ""} 
                          onValueChange={(val) => field.onChange(val || null)} 
                          placeholder="Select creator..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="verified_by"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-semibold">Verified By</FormLabel>
                      <FormControl>
                        <UserSearchSelect 
                          value={field.value ?? ""} 
                          onValueChange={(val) => field.onChange(val || null)} 
                          placeholder="Select verifier..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Active Toggle */}
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-2xl border border-slate-200 p-4 bg-white shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-slate-700 font-semibold">Active Status</FormLabel>
                      <FormDescription>Make this route visible on user search maps</FormDescription>
                    </div>
                    <FormControl>
                      <Button
                        type="button"
                        variant={field.value ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "w-24 rounded-xl font-bold",
                          field.value ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                        )}
                        onClick={() => field.onChange(!field.value)}
                      >
                        {field.value ? "Active" : "Inactive"}
                      </Button>
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-semibold">Route Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Provide details about viewpoints, track conditions, elevation..." 
                        readOnly={false} 
                        className="bg-white border-slate-200 focus:border-emerald-500 rounded-xl resize-y min-h-[100px]"
                        {...field} 
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Images Dropzone */}
              <FormField
                control={form.control}
                name="image_urls"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-semibold">Route Gallery Images</FormLabel>
                    <FormControl>
                      <ImageDropZone
                        filePath="fitness/outdoor/routes"
                        maxFiles={5}
                        onFilesChange={(urls) => field.onChange(urls)}
                        initialFiles={field.value || []}
                        text="Drag & drop route gallery photos here"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4 border-t gap-2 md:gap-0">
                <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={close} className="rounded-xl border-slate-200 min-w-[140px]">
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending} className="min-w-[240px] rounded-xl bg-slate-900 text-white hover:bg-slate-800">
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditMode ? "Update Route" : "Create Route"}
                </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddOutdoorRouteDialog;
