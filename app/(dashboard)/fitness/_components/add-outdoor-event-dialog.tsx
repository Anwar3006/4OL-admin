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
import { Calendar, Loader2 } from "lucide-react";
import { UserSearchSelect } from "./user-search-select";
import {
  fitnessOutdoorEventSchema,
  TFitnessOutdoorEventInput,
  CHALLENGE_STATUS,
} from "@/schemas/fitness-outdoor.schema";
import { useAddOutdoorEventDialog } from "@/stores/dialog-store";
import {
  useCreateFitnessOutdoorEvent,
  useUpdateFitnessOutdoorEvent,
  useFitnessOutdoorRoutes,
} from "@/hooks/supabase-calls/useFitnessOutdoor";
import { cn } from "@/lib/utils";

const formatDatetimeLocal = (date: Date | string | null | undefined): string => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  
  const pad = (num: number) => String(num).padStart(2, "0");
  
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const AddOutdoorEventDialog = () => {
  const { isOpen, close, data, isEditMode } = useAddOutdoorEventDialog();
  const { mutate: createEvent, isPending: isCreating } = useCreateFitnessOutdoorEvent();
  const { mutate: updateEvent, isPending: isUpdating } = useUpdateFitnessOutdoorEvent();

  // Fetch routes to link to the event
  const { data: routesData } = useFitnessOutdoorRoutes({ page: 1, limit: 100 });
  const routes = routesData?.routes || [];

  const isPending = isCreating || isUpdating;

  const defaultValues: TFitnessOutdoorEventInput = {
    route_id: null,
    title: "",
    description: "",
    start_at: new Date(),
    max_participants: null,
    current_participants: 0,
    status: "upcoming",
    created_by: null,
    latitude: null,
    longitude: null,
    area: "",
    category: "",
  };

  const form = useForm<TFitnessOutdoorEventInput>({
    resolver: zodResolver(fitnessOutdoorEventSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && data) {
        form.reset({
          route_id: data.route_id ?? null,
          title: data.title ?? "",
          description: data.description ?? "",
          start_at: data.start_at ? new Date(data.start_at) : new Date(),
          max_participants: data.max_participants ?? null,
          current_participants: data.current_participants ?? 0,
          status: data.status ?? "upcoming",
          created_by: data.created_by ?? null,
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
          area: data.area ?? "",
          category: data.category ?? "",
        });
      } else {
        form.reset(defaultValues);
      }
    }
  }, [isOpen, isEditMode, data]);

  const onSubmit = (values: TFitnessOutdoorEventInput) => {
    if (isEditMode && data?.id) {
      updateEvent({ id: data.id, data: values }, { onSuccess: close });
    } else {
      createEvent(values, { onSuccess: close });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-3xl overflow-y-auto max-h-[92vh] p-0 border-none shadow-2xl bg-white">
        <div className="bg-white rounded-lg overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b bg-gray-50">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-slate-800">
              <Calendar className="h-6 w-6 text-emerald-600" />
              {isEditMode ? "Edit Outdoor Event" : "Create Outdoor Event"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6 bg-white">
              
              {/* Event Title & Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-slate-700 font-semibold">Event Title *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. Saturday Morning Community Hike" 
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
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-semibold">Event Status *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white border-slate-200 focus:border-emerald-500 rounded-xl">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white z-[100] shadow-md border">
                          {CHALLENGE_STATUS.map((status) => (
                            <SelectItem key={status} value={status} className="capitalize cursor-pointer">
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

              {/* Connected Route & Start Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="route_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-semibold">Connected Route</FormLabel>
                      <Select onValueChange={(val) => field.onChange(val === "none" ? null : val)} value={field.value ?? "none"}>
                        <FormControl>
                          <SelectTrigger className="bg-white border-slate-200 focus:border-emerald-500 rounded-xl">
                            <SelectValue placeholder="Select Route (Optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white z-[100] shadow-md border">
                          <SelectItem value="none" className="italic cursor-pointer text-slate-400">None (No route)</SelectItem>
                          {routes.map((route) => (
                            <SelectItem key={route.id} value={route.id} className="cursor-pointer">
                              {route.name} ({route.distance_km || "0"} km)
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
                  name="start_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-semibold">Start Time *</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          value={formatDatetimeLocal(field.value)}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : new Date())}
                          readOnly={false}
                          className="bg-white border-slate-200 focus:border-emerald-500 rounded-xl text-slate-700"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Participants Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="max_participants"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-semibold">Max Participants</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="e.g. 25 (Blank for unlimited)" 
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

                <FormField
                  control={form.control}
                  name="current_participants"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-semibold">Current Participants</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="e.g. 5" 
                          readOnly={false} 
                          className="bg-white border-slate-200 focus:border-emerald-500 rounded-xl"
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
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
                      <FormLabel className="text-slate-700 font-semibold">Event Category</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. Hiking, Running, Meetup" 
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

              {/* Area & GPS Coordinates */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-semibold">Area / Neighborhood</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. Aburi Hills, Legon" 
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
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-semibold">Latitude</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.000001" 
                          placeholder="e.g. 5.75924" 
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
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-semibold">Longitude</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.000001" 
                          placeholder="e.g. -0.21984" 
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
              </div>

              {/* Creator user select */}
              <FormField
                control={form.control}
                name="created_by"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-semibold">Organizer (Created By)</FormLabel>
                    <FormControl>
                      <UserSearchSelect 
                        value={field.value ?? ""} 
                        onValueChange={(val) => field.onChange(val || null)} 
                        placeholder="Select organizer user..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Event Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-semibold">Event Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Provide details about meeting points, schedules, gear requirements, water stations..." 
                        readOnly={false} 
                        className="bg-white border-slate-200 focus:border-emerald-500 rounded-xl resize-y min-h-[120px]"
                        {...field} 
                        value={field.value ?? ""}
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
                  {isEditMode ? "Update Event" : "Create Event"}
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

export default AddOutdoorEventDialog;
export { formatDatetimeLocal };
