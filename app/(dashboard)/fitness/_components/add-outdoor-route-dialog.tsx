// app/(dashboard)/fitness/_components/add-outdoor-route-dialog.tsx
"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, Loader2, UploadCloud } from "lucide-react";
import ImageDropZone from "@/components/ImageDropZone";
import { useAddOutdoorRouteDialog } from "@/stores/dialog-store";
import {
  useCreateFitnessOutdoorRoute,
  useUpdateFitnessOutdoorRoute,
} from "@/hooks/supabase-calls/useFitnessOutdoor";
import { GHANA_REGIONS_ENUM } from "@/types/formInput";

// Expanded Schema handling Area, Region, and Metadata injection
const routeFormSchema = z.object({
  name: z.string().min(2, "Route name required"),
  category: z.string().min(1, "Category required"),
  difficulty: z.string().min(1, "Difficulty required"),
  distance_km: z.number().positive("Must be positive"),
  estimated_duration_mins: z.number().nullable(),
  area: z.string().min(1, "Area/Suburb required"),
  region: z.string().min(1, "Region required"),
  surface_type: z.string().optional(),
  description: z.string().optional(),
  verification_status: z.string(),
  registered_by: z.string().optional(), // Maps to JSON metadata
  fitcoins_reward: z.number().default(50), // Maps to JSON metadata
  features: z.array(z.string()).default([]), // Maps to JSON metadata
  image_url: z.array(z.string()).default([]),
  gpx_file_url: z.string().optional(), // Maps to JSON gps_data
});

type FormValues = z.infer<typeof routeFormSchema>;

const SAFETY_TAGS = [
  "Safe at night",
  "Well lit",
  "Ocean view",
  "Coastal",
  "Shade cover",
  "Water stations",
  "Parking available",
  "Restrooms",
  "Pet friendly",
];

const AddOutdoorRouteDialog = () => {
  const { isOpen, close, data, isEditMode } = useAddOutdoorRouteDialog();
  const { mutate: createRoute, isPending: isCreating } =
    useCreateFitnessOutdoorRoute();
  const { mutate: updateRoute, isPending: isUpdating } =
    useUpdateFitnessOutdoorRoute();
  const isPending = isCreating || isUpdating;

  const form = useForm<FormValues>({
    resolver: zodResolver(routeFormSchema),
    defaultValues: {
      name: "",
      category: "Running",
      difficulty: "low",
      distance_km: 0,
      estimated_duration_mins: null,
      area: "",
      region: "Greater Accra",
      surface_type: "Paved",
      description: "",
      verification_status: "official_business",
      registered_by: "",
      fitcoins_reward: 50,
      features: [],
      image_url: [],
      gpx_file_url: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && data) {
        // Extract metadata cleanly from gps_data JSONB if editing
        const meta = (data.gps_data as any) || {};
        form.reset({
          name: data.name ?? "",
          category: data.category ?? "Running",
          difficulty: data.difficulty ?? "low",
          distance_km: data.distance_km ?? 0,
          estimated_duration_mins: data.estimated_duration_mins ?? null,
          area: data.area ?? "",
          region: data.region ?? "Greater Accra",
          surface_type: data.surface_type ?? "Paved",
          description: data.description ?? "",
          verification_status: data.verification_status ?? "official_business",
          registered_by: meta.registered_by ?? "",
          fitcoins_reward: meta.fitcoins_reward ?? 50,
          features: meta.features ?? [],
          image_url: Array.isArray(data.image_url) ? data.image_url : [],
          gpx_file_url: meta.gpx_file_url ?? "",
        });
      } else {
        form.reset();
      }
    }
  }, [isOpen, isEditMode, data, form]);

  const onSubmit = (values: FormValues) => {
    // Package custom fields into the gps_data JSONB payload to avoid schema altering
    const payload = {
      name: values.name,
      category: values.category.toLowerCase(),
      difficulty: values.difficulty,
      distance_km: values.distance_km,
      estimated_duration_mins: values.estimated_duration_mins,
      area: values.area,
      region: values.region,
      surface_type: values.surface_type,
      description: values.description,
      verification_status: values.verification_status,
      image_url: values.image_url,
      is_active: true,
      gps_data: {
        features: values.features,
        fitcoins_reward: values.fitcoins_reward,
        registered_by: values.registered_by,
        gpx_file_url: values.gpx_file_url,
      },
    };

    if (isEditMode && data?.id) {
      updateRoute({ id: data.id, data: payload as any }, { onSuccess: close });
    } else {
      createRoute(payload as any, { onSuccess: close });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-3xl overflow-y-auto max-h-[92vh] p-0 border-none shadow-2xl bg-white">
        <DialogHeader className="p-6 pb-4 border-b bg-gray-50">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
            🗺️ {isEditMode ? "Edit Outdoor Route" : "Add Outdoor Route"}
          </DialogTitle>
          <p className="text-sm text-slate-500">
            Register a new outdoor workout route for the fitness app
          </p>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="p-6 space-y-5 bg-white"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Route Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Labone Beach Run" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4 w-full">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white">
                        {["Running", "Walking", "Cycling", "Hiking"].map(
                          (t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Difficulty *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white">
                        <SelectItem value="low">Beginner</SelectItem>
                        <SelectItem value="medium">Intermediate</SelectItem>
                        <SelectItem value="high">Advanced</SelectItem>
                        <SelectItem value="extreme">Extreme</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="distance_km"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Distance (km) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 3.2"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="estimated_duration_mins"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Est. Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g. 22"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || null)
                        }
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area / Suburb *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Labone" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white">
                        {GHANA_REGIONS_ENUM.map((r) => (
                          <SelectItem key={r} value={r.toUpperCase()}>
                            {r.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="surface_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Surface Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white">
                      {["Paved", "Trail", "Mixed", "Sand"].map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Route Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the route experience, scenery, safety notes..."
                      className="resize-y"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="verification_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white">
                        <SelectItem value="approved">
                          Official Business Verified
                        </SelectItem>
                        <SelectItem value="pending_review">
                          Community Verified
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="registered_by"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registered By (Business)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. FitLife Gym" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Tags Grid */}
            <FormField
              control={form.control}
              name="features"
              render={() => (
                <FormItem className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <div className="font-bold text-sm text-slate-800 mb-3">
                    📋 Safety & Features Tags
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {SAFETY_TAGS.map((tag) => (
                      <FormField
                        key={tag}
                        control={form.control}
                        name="features"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={tag}
                              className="flex flex-row items-start space-x-2 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(tag)}
                                  onCheckedChange={(checked) => {
                                    const currentValues = Array.isArray(
                                      field.value,
                                    )
                                      ? field.value
                                      : [];
                                    return checked
                                      ? field.onChange([...currentValues, tag])
                                      : field.onChange(
                                          currentValues.filter(
                                            (val) => val !== tag,
                                          ),
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-xs font-medium cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                {tag}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fitcoins_reward"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>FitCoins Reward per Completion</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* File Uploaders */}
            <FormField
              control={form.control}
              name="image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Route Gallery Image</FormLabel>
                  <FormControl>
                    <ImageDropZone
                      filePath="fitness/outdoor/routes"
                      maxFiles={1}
                      onFilesChange={(urls) => field.onChange(urls)}
                      initialFiles={field.value || []}
                      text="Upload a featured route image"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* GPX Upload Stub */}
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50 mt-2">
              <div className="text-2xl mb-2">🗺️</div>
              <Button
                type="button"
                variant="outline"
                className="h-8 text-xs font-bold text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
              >
                <UploadCloud className="w-3 h-3 mr-2" /> Upload GPX Route File
              </Button>
              <div className="text-[10px] text-slate-400 mt-2">
                Or draw route on map (feature coming soon)
              </div>
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={close}
                className="rounded-xl border-slate-200 min-w-[120px]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="min-w-[180px] rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                📋 {isEditMode ? "Update Route" : "Add Route"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddOutdoorRouteDialog;
